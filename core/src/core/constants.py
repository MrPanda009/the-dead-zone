"""Shared domain constants.

Single source of truth for every number both the pipeline (scoring) and the API
(`POST /scenario` re-ranking) compute against. Section refs are to docs/PRD1.md.
"""

from enum import StrEnum


class Hazard(StrEnum):
    LANDSLIDE = "landslide"
    FLASH_FLOOD = "flash_flood"
    STORM_SURGE = "storm_surge"
    RIVERINE_FLOOD = "riverine_flood"
    COASTAL_EROSION = "coastal_erosion"
    CLOUDBURST = "cloudburst"


class ZoneClass(StrEnum):
    PERMANENT_RED = "permanent_red"
    CAUTION = "caution"
    ACTIVE_ALERT = "active_alert"
    FORECAST_ALERT = "forecast_alert"
    NONE = "none"


class Tier(StrEnum):
    IMMEDIATE = "immediate"
    SHORT_TERM = "short_term"
    MEDIUM_TERM = "medium_term"
    MITIGATE_IN_SITU = "mitigate_in_situ"


# FR-3.5 — multi-hazard union weights
HAZARD_WEIGHTS: dict[Hazard, float] = {
    Hazard.LANDSLIDE: 1.0,
    Hazard.FLASH_FLOOD: 1.0,
    Hazard.STORM_SURGE: 0.9,
    Hazard.RIVERINE_FLOOD: 0.8,
    Hazard.COASTAL_EROSION: 0.7,
}

# FR-3.2 — trigger amplification in H_h = clamp(S_h * (1 + BETA * T_h), 0, 1)
BETA = 1.0

# FR-3.8 / 3.9 / 3.10 — zone thresholds
PRZ_MHI_STATIC = 0.75
PRZ_ANY_SUSCEPTIBILITY = 0.85
PRZ_FATAL_EVENT_MHI = 0.60
PRZ_FATAL_EVENT_YEARS = 25
CAUTION_MHI_MIN = 0.45
ACTIVE_ALERT_MHI_LIVE = 0.75

# FR-3.12 — forecast horizon, pilot districts only
FORECAST_HORIZON_HOURS = 72

# FR-4.1 — antecedent rainfall index
ARI_DECAY_K = 0.9
ARI_WINDOW_DAYS = 15

# FR-6.1 / 6.2 — priority score
PRIORITY_GAMMA = 0.5
LOSS_HALF_LIFE_YEARS = 10

# §9.3 — H3 resolutions
H3_RES_OVERVIEW = 6
H3_RES_NATIONAL = 7
H3_RES_PILOT = 8
H3_RES_SITE = 9

# FR-7.1 / 7.2 — candidate site generation and eligibility mask
SITE_SEARCH_RADIUS_KM = 15.0
SITE_MAX_MHI_STATIC = 0.25
SITE_MAX_SLOPE_DEG = 15.0
SITE_MIN_AREA_HA = 2.0

# §6.8 — carrying capacity norms
PLOT_AREA_M2 = 90.0
INFRA_OVERHEAD = 0.40
AREA_PER_HOUSEHOLD_M2 = PLOT_AREA_M2 * (1 + INFRA_OVERHEAD)  # ~126
LPCD_RURAL = 55
LPCD_URBAN_SEWERED = 135
PHC_POP_PLAINS = 30_000
PHC_POP_HILLY_TRIBAL = 20_000
LIVELIHOOD_MULTIPLIER_RANGE = (0.6, 1.0)
