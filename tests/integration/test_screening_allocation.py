"""Screening-mode allocation over derived parcels (unverified tenure, land-only capacity).

Derived parcels are written with `tenure_unverified` and no measured lifeline capacity, so
`cc_final` is NULL. Order-grade runs must keep rejecting them; screening runs must reach the
solver and say what they assumed.
"""

from __future__ import annotations

import pytest
from sqlalchemy import text

from api.repositories.allocation_repo import AllocationRepository
from api.services.allocation_service import AllocationService
from core.domain.allocation import HabitationDemand
from core.domain.capacity import SCREENING_SITE_POLICY, CandidateSitePolicy
from core.enums import Tier


@pytest.fixture
def derived_district_habitations(db_session):
    """Habitations of a district whose derived parcels have no cc_final, or skip."""
    admin_id = db_session.execute(
        text(
            """
            SELECT cs.admin_id FROM candidate_site cs
            WHERE cs.tenure = 'tenure_unverified' AND cs.cc_final IS NULL AND cs.cc_land > 0
              AND cs.mhi_max < 0.25 AND cs.slope_mean < 15 AND cs.area_ha >= 2
              AND EXISTS (SELECT 1 FROM habitation h WHERE h.admin_id = cs.admin_id)
            GROUP BY cs.admin_id ORDER BY count(*) DESC LIMIT 1
            """
        )
    ).scalar()
    if admin_id is None:
        pytest.skip("No derived candidate sites with unmeasured lifelines in this database")
    rows = db_session.execute(
        text("SELECT id FROM habitation WHERE admin_id = :a AND households > 0 ORDER BY id LIMIT 10"),
        {"a": admin_id},
    ).fetchall()
    return [r[0] for r in rows]


def _derived_only(sites):
    return [s for s in sites if s["tenure"] == "tenure_unverified"]


def test_order_grade_policy_still_rejects_derived_parcels(db_session, derived_district_habitations):
    sites, _ = AllocationRepository(db_session).get_candidate_sites_and_distances(
        habitation_ids=derived_district_habitations,
        max_radius_m=15_000.0,
        policy=CandidateSitePolicy(),
    )
    assert not _derived_only(sites), "Unverified tenure must never pass an order-grade query"


def test_screening_policy_admits_derived_parcels_at_land_capacity(db_session, derived_district_habitations):
    sites, _ = AllocationRepository(db_session).get_candidate_sites_and_distances(
        habitation_ids=derived_district_habitations,
        max_radius_m=15_000.0,
        policy=SCREENING_SITE_POLICY,
    )
    derived = _derived_only(sites)
    assert derived, "Screening policy should admit derived parcels"
    assert all(s["capacity"] > 0 for s in derived)
    assert any(s["capacity_basis"] == "land_only_provisional" for s in derived)


def test_screening_allocation_places_households_and_reports_caveats(db_session, derived_district_habitations):
    demands = [
        HabitationDemand(id=h_id, name=f"H{h_id}", demand_households=20, priority_score=0.8, tier=Tier.IMMEDIATE)
        for h_id in derived_district_habitations
    ]
    service = AllocationService(db_session, policy=SCREENING_SITE_POLICY)

    result = service.simulate_allocation(demands, max_search_radius_km=15.0)

    assert result.total_relocated_households > 0
    caveats = service._screening_caveats(
        result.assignments,
        [
            {"id": a.site_id, "capacity_basis": "land_only_provisional", "tenure": "tenure_unverified"}
            for a in result.assignments
        ],
    )
    assert len(caveats) == 2
    assert "land-only" in caveats[0] and "tenure" in caveats[1]
