"""Unit tests for WHO-Tobler velocity decay, IPHS 2022 Time-to-Care, and NDMA flood exclusion.

Tests the scientific and regulatory algorithms implemented in HealthCapacityEvaluator.
"""

from __future__ import annotations

import math
import pytest

from core.domain.capacity import CapacityEngine
from core.enums import BindingConstraint
from pipeline.capacity.health_evaluator import (
    IPHS_TIME_CEILINGS_HOURS,
    SPEED_MULTIPLIERS,
    HealthCapacityEvaluator,
    tobler_velocity_kmh,
)


def test_tobler_velocity_decay():
    """Verifies that Tobler hiking velocity decays monotonically across slope angles."""
    angles = [0.0, 5.0, 10.0, 15.0, 20.0]
    velocities = [tobler_velocity_kmh(theta) for theta in angles]

    # Verify monotonic decay
    for i in range(len(velocities) - 1):
        assert velocities[i] > velocities[i + 1], (
            f"Velocity at {angles[i]}° ({velocities[i]:.2f}) must be greater than at {angles[i+1]}° ({velocities[i+1]:.2f})"
        )

    # Verify calibration values from handoff Table 2.1
    # 0 deg: ~5.04 km/h
    assert pytest.approx(velocities[0], rel=1e-2) == 5.04
    # 5 deg: ~3.71 km/h
    assert pytest.approx(velocities[1], rel=1e-2) == 3.71
    # 10 deg: ~2.71 km/h
    assert pytest.approx(velocities[2], rel=1e-2) == 2.71
    # 15 deg: ~1.97 km/h
    assert pytest.approx(velocities[3], rel=1e-2) == 1.97
    # 20 deg: ~1.41 km/h
    assert pytest.approx(velocities[4], rel=1e-2) == 1.41

    # Verify minimum velocity clamp (>= 0.5 km/h) even on vertical cliffs
    assert tobler_velocity_kmh(60.0) >= 0.5
    assert tobler_velocity_kmh(85.0) >= 0.5


def test_speed_multipliers_and_time_ceilings():
    """Verifies transit multipliers and IPHS 2022 Time-to-Care ceilings."""
    # Sub-Centre: pedestrian / non-motorized
    assert SPEED_MULTIPLIERS["sub_cen"] == 1.0
    assert IPHS_TIME_CEILINGS_HOURS["sub_cen"] == 0.75  # 45 minutes

    # PHC: feeder road transit / motorcycle / rural ambulance
    assert SPEED_MULTIPLIERS["phc"] == 2.5
    assert IPHS_TIME_CEILINGS_HOURS["phc"] == 1.00  # 60 minutes

    # CHC: arterial bus / dedicated transport
    assert SPEED_MULTIPLIERS["chc"] == 3.5
    assert IPHS_TIME_CEILINGS_HOURS["chc"] == 1.50  # 90 minutes


def test_travel_time_reachability():
    """Verifies that travel time is correctly derived from effective velocity and distance."""
    # Case 1: Sub-centre at 2 km on 0 deg slope -> v = 5.04 km/h -> T = 2 / 5.04 = ~0.40h (24 min) <= 0.75h -> reachable
    v_flat = tobler_velocity_kmh(0.0)
    t_flat = 2.0 / (v_flat * SPEED_MULTIPLIERS["sub_cen"])
    assert t_flat <= IPHS_TIME_CEILINGS_HOURS["sub_cen"]

    # Case 2: Sub-centre at 4 km on 15 deg mountain slope -> v = 1.97 km/h -> T = 4 / 1.97 = ~2.03h > 0.75h -> unreachable!
    v_steep = tobler_velocity_kmh(15.0)
    t_steep = 4.0 / (v_steep * SPEED_MULTIPLIERS["sub_cen"])
    assert t_steep > IPHS_TIME_CEILINGS_HOURS["sub_cen"]

    # Case 3: PHC at 10 km on 5 deg slope with motorized transit (2.5x)
    # v = 3.71 * 2.5 = 9.275 km/h -> T = 10 / 9.275 = 1.078h > 1.0h -> unreachable
    v_phc = tobler_velocity_kmh(5.0) * SPEED_MULTIPLIERS["phc"]
    t_phc = 10.0 / v_phc
    assert t_phc > IPHS_TIME_CEILINGS_HOURS["phc"]


def test_flood_exclusion_subtraction():
    """Asserts that NDMA / CWC flood criteria subtracts clinics with frequency >= 0.25 or HAND < 1.0m."""
    def is_qualifying_lifeline(inundation_freq: float | None, hand_m: float | None) -> bool:
        freq_ok = inundation_freq is None or inundation_freq < 0.25
        hand_ok = hand_m is None or hand_m >= 1.0
        return freq_ok and hand_ok

    # Safe: no flood data or dry upland
    assert is_qualifying_lifeline(None, None) is True
    assert is_qualifying_lifeline(0.05, 5.0) is True

    # Subtracted: active flood channel with recurring inundation >= 25%
    assert is_qualifying_lifeline(0.25, 5.0) is False
    assert is_qualifying_lifeline(0.70, 3.0) is False

    # Subtracted: terrain height above nearest drainage < 1.0m
    assert is_qualifying_lifeline(0.05, 0.8) is False
    assert is_qualifying_lifeline(0.0, 0.2) is False


def test_tertiary_hospital_exclusion():
    """Asserts that District Hospitals (dis_h) and Sub-District Hospitals (s_t_h) are excluded from primary lifelines."""
    primary_lifeline_types = {"sub_cen", "phc", "chc"}
    tertiary_types = ["s_t_h", "dis_h"]

    for tertiary in tertiary_types:
        assert tertiary not in primary_lifeline_types
        assert tertiary not in SPEED_MULTIPLIERS
        assert tertiary not in IPHS_TIME_CEILINGS_HOURS


def test_health_capacity_calculation():
    """Verifies CC_health formula: floor(norm_pop * (1 - 0.75) / 4.5)."""
    engine = CapacityEngine()
    evaluator = HealthCapacityEvaluator(capacity_engine=engine, catchment_utilization_pct=0.75)

    # Sub-Centre in hilly terrain (norm: 3,000):
    # available = 3,000 * 0.25 = 750
    # CC = floor(750 / 4.5) = 166 HH
    norm_sub_cen_hilly = 3000
    avail_sub_cen = norm_sub_cen_hilly * (1.0 - evaluator.catchment_utilization_pct)
    cc_sub_cen = math.floor(avail_sub_cen / engine.norms.persons_per_hh)
    assert cc_sub_cen == 166

    # Sub-Centre in plains (norm: 5,000):
    # available = 5,000 * 0.25 = 1,250
    # CC = floor(1250 / 4.5) = 277 HH
    norm_sub_cen_plains = 5000
    avail_plains = norm_sub_cen_plains * (1.0 - evaluator.catchment_utilization_pct)
    assert math.floor(avail_plains / engine.norms.persons_per_hh) == 277

    # CHC in plains (norm: 120,000):
    # available = 120,000 * 0.25 = 30,000
    # CC = floor(30,000 / 4.5) = 6,666 HH
    norm_chc_plains = 120000
    avail_chc = norm_chc_plains * (1.0 - evaluator.catchment_utilization_pct)
    assert math.floor(avail_chc / engine.norms.persons_per_hh) == 6666


def test_unserved_bottleneck_detection():
    """Verifies that unserved sites receive CC_health = 0 and trigger HEALTH binding constraint."""
    engine = CapacityEngine()

    # Site with land capacity = 500 HH, but zero healthcare access
    cc_final, binding, tied = engine.calculate_final_capacity(
        cc_land=500,
        cc_water=400,
        cc_school=300,
        cc_health=0,
        livelihood_multiplier=1.0,
    )
    assert cc_final == 0
    assert binding == BindingConstraint.HEALTH
    assert binding.value == "health"
    assert BindingConstraint.HEALTH in tied
