"""Canonical Pydantic v2 schemas for ML Explainability & Feature Attributions.

Section refs: docs/PRD1.md §6.10, §14.1 (FR-9.1, FR-9.2)
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional
from pydantic import Field

from core.constants import SCREENING_GRADE_NOTICE
from core.schemas.common import BaseSchema


class FeatureContributionDTO(BaseSchema):
    """Single feature attribution item for a cell or habitation."""
    feature: str = Field(description="Feature name, e.g. slope_deg, hand_m, dist_to_road_m, rainfall_72h.")
    value: float = Field(description="Observed or calculated feature value.")
    contribution: float = Field(description="Attribution weight or SHAP value contribution.")
    method: str = Field(
        default="heuristic",
        description="Explanation method ('treeshap', 'kernelshap', 'heuristic', 'pca_loading').",
    )
    rank: Optional[int] = Field(
        default=None,
        ge=1,
        description="Rank of this feature in importance (1 = top contributing factor).",
    )


class CanonicalExplanationRecord(BaseSchema):
    """Canonical model explanation container for an H3 cell.
    
    Decouples raw ML team SHAP outputs / XGBoost trees from core domain serving layers.
    """
    h3: str = Field(description="Hexadecimal H3 index.")
    h3_int: int = Field(description="64-bit integer H3 index.")
    model_version: str = Field(default="v1.0.0", description="Model version that produced the attributions.")
    method: str = Field(default="treeshap", description="Attribution algorithm used.")
    factors: list[FeatureContributionDTO] = Field(
        default_factory=list,
        description="Top contributing feature factors ordered by absolute impact.",
    )
    confidence: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Model confidence score in [0.0, 1.0] if provided by ML team.",
    )
    uncertainty: Optional[dict[str, Any]] = Field(
        default=None,
        description="Preserved uncertainty metrics (e.g. interval bounds, variance) from ML product.",
    )
    generated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="UTC timestamp when explanation was computed.",
    )
    screening_grade: str = Field(default=SCREENING_GRADE_NOTICE, description="Screening grade disclaimer.")


class ExplanationBatchDTO(BaseSchema):
    """Batch ingestion payload for ML-provided explanations."""
    model_name: str
    model_version: str
    calculation_version: str = "calc-v1.0"
    records: list[CanonicalExplanationRecord] = Field(default_factory=list)
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
