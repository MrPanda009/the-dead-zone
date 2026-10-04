"""Plain-language context for each flood hazard regime, shown in the cell dossier.

Kept free of I/O so the wording and driver ordering can be unit-tested on their own.
"""

from typing import Optional

from core.enums import HazardRegime
from core.schemas.hazard import RegimeContextDTO

_CONTEXTS: dict[HazardRegime, RegimeContextDTO] = {
    HazardRegime.FLOODPLAIN: RegimeContextDTO(
        regime=HazardRegime.FLOODPLAIN,
        headline="Inland floodplain",
        description=(
            "Inland alluvial plain, usually behind embankments. The main risk is backwater "
            "flooding when tributaries run high and embankment breaches. The score combines "
            "terrain drainage (HAND), inundation in excess of normal river water, and closeness "
            "to a major tributary."
        ),
        primary_hazards=["Backwater flooding", "Embankment breach"],
        scoring_basis="floodplain: HAND + anomalous SAR frequency + tributary proximity",
        key_drivers=[
            "mean_hand_m",
            "mean_anomalous_frequency",
            "dist_tributary_m",
            "mean_inundation_frequency",
            "mean_slope_deg",
            "mean_cropland_fraction",
        ],
    ),
    HazardRegime.CHAR_BELT: RegimeContextDTO(
        regime=HazardRegime.CHAR_BELT,
        headline="Char belt (river sandbar)",
        description=(
            "River sandbar island in the Brahmaputra system. Here the dominant threats are "
            "lateral bank erosion, seasonal submersion and loss of cultivable land, not a single "
            "monsoon flood. Water on a char is partly normal river presence, so the score rests on "
            "surface instability, long-term water occurrence and proximity to the mainstem rather "
            "than on flood frequency alone. It is not comparable with a floodplain score."
        ),
        primary_hazards=["Bank erosion", "Seasonal submersion", "Loss of cultivable land"],
        scoring_basis="char belt: SAR instability + JRC water occurrence + mainstem proximity",
        key_drivers=[
            "sar_instability",
            "jrc_occurrence_mean",
            "dist_mainstem_m",
            "mean_inundation_frequency",
            "baseline_water_fraction",
        ],
    ),
    HazardRegime.CHANNEL: RegimeContextDTO(
        regime=HazardRegime.CHANNEL,
        headline="Active river channel",
        description=(
            "Perennial river water. This cell is not terrestrial land, so it is excluded from "
            "susceptibility scoring and from risk statistics. The 0.0 shown is a placeholder, "
            "not a safe reading."
        ),
        primary_hazards=["Not scored (river channel)"],
        scoring_basis="channel: excluded from terrestrial scoring",
        key_drivers=["jrc_occurrence_mean", "baseline_water_fraction"],
    ),
}


def regime_context_for(regime: Optional[str]) -> Optional[RegimeContextDTO]:
    """Returns the context for a regime value, or None for null / unknown regimes."""
    try:
        return _CONTEXTS[HazardRegime(regime)] if regime else None
    except ValueError:
        return None
