"""Provenance of a zone cell: which model scored it and whether its inputs are real.

`seed_pilot_data` fabricates terrain features, population and scores for the pilot
districts (`demo-day2-v1`, scored by the analytical `baseline-v1` providers). Districts whose
layers have since been rebuilt from real rasters carry other version labels. The API used to
stamp every cell `baseline-v1` / `synthetic` regardless; these helpers derive both from the
versions actually stored against the cell.
"""

from __future__ import annotations

from typing import Iterable, Mapping, Optional

from core.enums import DataQuality

#: `grid_cell.dataset_version` values written by the deterministic seed fixtures.
SYNTHETIC_DATASET_VERSIONS: frozenset[str] = frozenset({"demo-day2-v1"})

#: `hazard_static.model_version` values from the analytical baseline providers, which the seed
#: feeds with synthetic terrain features.
SYNTHETIC_MODEL_VERSIONS: frozenset[str] = frozenset({"baseline-v1"})

#: Reported when a cell has no `hazard_static` row to take a model version from.
UNKNOWN_MODEL_VERSION = "unknown"


def pick_model_version(
    hazards: Iterable[Mapping[str, object]],
    dominant_hazard: Optional[str] = None,
) -> str:
    """Model version behind the cell's score, preferring the dominant hazard's row."""
    rows = [h for h in hazards if h.get("model_version")]
    if not rows:
        return UNKNOWN_MODEL_VERSION
    for row in rows:
        if dominant_hazard is not None and row.get("hazard_type") == dominant_hazard:
            return str(row["model_version"])
    return str(rows[0]["model_version"])


def classify_data_quality(dataset_version: Optional[str], model_version: Optional[str]) -> DataQuality:
    """SYNTHETIC if either input is a seed fixture, MISSING if the model is unknown, else VALID."""
    if model_version in (None, UNKNOWN_MODEL_VERSION):
        return DataQuality.MISSING
    if dataset_version in SYNTHETIC_DATASET_VERSIONS or model_version in SYNTHETIC_MODEL_VERSIONS:
        return DataQuality.SYNTHETIC
    return DataQuality.VALID
