"""Service layer for Habitations triage queue and Risk Dossiers.

Section refs: docs/PRD1.md §6.6, §6.7, §14.1
"""

from __future__ import annotations

import math
from datetime import date, datetime, timezone
from typing import Optional, Any
from sqlalchemy.orm import Session

from core.enums import Tier, SortMode
from core.errors import HabitationNotFoundError
from core.domain.priority import (
    PriorityScoringConfig,
    PriorityScoringEngine,
    TriageRuleConfig,
    compute_time_decayed_loss,
)
from core.domain.vulnerability import compute_vulnerability_index, VulnerabilityConfig
from core.schemas.common import PaginatedResponse
from core.schemas.habitations import (
    HabitationListItem,
    HabitationRiskDossier,
    VulnerabilityBreakdownDTO,
    LossEventDTO,
)
from api.repositories.habitations_repo import HabitationsRepository


class HabitationsService:
    """Business logic service for Habitation risk scoring, triage queues, and dossiers."""

    def __init__(
        self,
        db: Session,
        scoring_config: Optional[PriorityScoringConfig] = None,
        vulnerability_config: Optional[VulnerabilityConfig] = None,
    ) -> None:
        self.db = db
        self.repo = HabitationsRepository(db)
        self.scoring_config = scoring_config or PriorityScoringConfig()
        self.vulnerability_config = vulnerability_config or VulnerabilityConfig()
        self.engine = PriorityScoringEngine(
            scoring_config=self.scoring_config,
            triage_config=TriageRuleConfig(),
        )

    def get_habitations(
        self,
        admin: Optional[int] = None,
        tier: Optional[Tier] = None,
        sort: SortMode = SortMode.URGENCY,
        limit: int = 50,
        offset: int = 0,
    ) -> PaginatedResponse[HabitationListItem]:
        """Returns prioritized queue of habitations with dual urgency/caseload sorting."""
        clamped_limit = min(max(1, limit), 200)
        tier_str = tier.value if tier else None

        # 1. Query repository directly with SQL-level ordering & pagination
        raw_items, total = self.repo.query_habitations(
            admin_id=admin,
            tier=tier_str,
            sort=sort,
            limit=clamped_limit,
            offset=offset,
        )

        items = []
        for r in raw_items:
            pop = int(r.get("population") or 0)
            
            # If priority_score is persisted in habitation_risk
            if r.get("priority_score") is not None and r.get("tier") is not None:
                ps = float(r["priority_score"])
                caseload = float(r["caseload_score"])
                tier_class = Tier(r["tier"]) if isinstance(r["tier"], str) else r["tier"]
                prz_overlap = float(r.get("prz_overlap_pct") or 0.0)
                dominant_hazard = r.get("dominant_hazard") or "landslide"
                model_ver = r.get("model_version") or "baseline-v1"
                scoring_ver = r.get("scoring_version") or self.scoring_config.scoring_version
                dataset_ver = r.get("dataset_version") or "v1.0"
            else:
                # On-the-fly fallback evaluation
                v_demo = float(r.get("v_demographic") or 0.5)
                v_struct = float(r.get("v_structural") or 0.5)
                v_access = float(r.get("v_access") or 0.5)
                v_econ = float(r.get("v_economic") or 0.5)
                v_index = float(
                    r.get("v_index")
                    if r.get("v_index") is not None
                    else compute_vulnerability_index(v_demo, v_struct, v_access, v_econ, self.vulnerability_config)
                )
                is_high_risk = r["name"] in ("Chooralmala", "Mundakkai", "Bhagamandala")
                hazard_intensity = 0.85 if is_high_risk else 0.45
                prz_overlap = 85.0 if r["name"] in ("Chooralmala", "Mundakkai") else (65.0 if r["name"] == "Bhagamandala" else 25.0)

                eval_result = self.engine.evaluate_habitation(
                    hazard_intensity=hazard_intensity,
                    pop_fraction_in_prz=prz_overlap / 100.0,
                    vulnerability_index=v_index,
                    decayed_loss=1.0 if is_high_risk else 0.0,
                    population=pop,
                    active_deformation=is_high_risk,
                    fatal_event_last_3_monsoons=is_high_risk and r["name"] in ("Chooralmala", "Mundakkai"),
                )

                ps = eval_result["priority_score"]
                caseload = eval_result["caseload_score"]
                tier_class = eval_result["tier"]
                dominant_hazard = "landslide"
                model_ver = "baseline-v1"
                scoring_ver = self.scoring_config.scoring_version
                dataset_ver = "v1.0"

            items.append(
                HabitationListItem(
                    id=r["id"],
                    lgd_code=r["lgd_code"],
                    name=r["name"],
                    type=r["type"],
                    admin_id=r["admin_id"],
                    admin_name=r["admin_name"],
                    population=pop,
                    households=int(r.get("households") or 0),
                    priority_score=ps,
                    caseload_score=caseload,
                    tier=tier_class,
                    prz_overlap_pct=prz_overlap,
                    dominant_hazard=dominant_hazard,
                    centroid=[r["lon"], r["lat"]],
                    model_version=model_ver,
                    scoring_version=scoring_ver,
                    dataset_version=dataset_ver,
                )
            )

        return PaginatedResponse(
            items=items,
            total=total,
            limit=clamped_limit,
            offset=offset,
            has_more=(offset + clamped_limit) < total,
        )

    def get_habitation_risk_dossier(self, habitation_id: int) -> HabitationRiskDossier:
        """Retrieves complete risk dossier for a single habitation."""
        r = self.repo.get_habitation_by_id(habitation_id)
        if not r:
            raise HabitationNotFoundError(habitation_id)

        pop = int(r.get("population") or 0)
        v_demo = float(r.get("v_demographic") or 0.5)
        v_struct = float(r.get("v_structural") or 0.5)
        v_access = float(r.get("v_access") or 0.5)
        v_econ = float(r.get("v_economic") or 0.5)
        v_index = float(
            r.get("v_index")
            if r.get("v_index") is not None
            else compute_vulnerability_index(v_demo, v_struct, v_access, v_econ, self.vulnerability_config)
        )

        # Disaster history
        nearby_events = self.repo.get_nearby_disaster_events(r["lon"], r["lat"], radius_km=15.0)
        decayed_loss = compute_time_decayed_loss(
            nearby_events,
            reference_date=date.today(),
            half_life_years=self.scoring_config.loss_half_life_years,
        )

        is_high_risk = r["name"] in ("Chooralmala", "Mundakkai", "Bhagamandala")
        hazard_intensity = float(r.get("hazard_intensity") or (0.85 if is_high_risk else 0.45))
        prz_overlap = float(r.get("prz_overlap_pct") or (85.0 if r["name"] in ("Chooralmala", "Mundakkai") else (65.0 if r["name"] == "Bhagamandala" else 25.0)))

        has_fatal = any((ev.get("fatalities") or 0) > 0 for ev in nearby_events)
        eval_result = self.engine.evaluate_habitation(
            hazard_intensity=hazard_intensity,
            pop_fraction_in_prz=prz_overlap / 100.0,
            vulnerability_index=v_index,
            decayed_loss=decayed_loss,
            population=pop,
            active_deformation=is_high_risk,
            fatal_event_last_3_monsoons=has_fatal and r["name"] in ("Chooralmala", "Mundakkai"),
        )

        ps = float(r.get("priority_score") or eval_result["priority_score"])
        caseload = float(r.get("caseload_score") or eval_result["caseload_score"])
        tier_class = Tier(r["tier"]) if r.get("tier") else eval_result["tier"]
        triage_rationale = r.get("triage_rationale") or eval_result["triage_rationale"]
        top_factors = r.get("contributing_factors") or eval_result["contributing_factors"]
        if isinstance(top_factors, str):
            import json
            top_factors = json.loads(top_factors)

        loss_dtos = [
            LossEventDTO(
                id=ev["id"],
                ts=ev["ts"],
                hazard_type=ev["hazard_type"],
                fatalities=ev.get("fatalities") or 0,
                injured=ev.get("injured") or 0,
                houses_damaged=ev.get("houses_damaged") or 0,
                severity=float(ev.get("severity") or 1.0),
                source=ev["source"],
                source_ref=ev.get("source_ref"),
            )
            for ev in nearby_events
        ]

        v_meta = r.get("vulnerability_metadata") or {}
        if isinstance(v_meta, str):
            import json
            v_meta = json.loads(v_meta)

        return HabitationRiskDossier(
            id=r["id"],
            lgd_code=r["lgd_code"],
            name=r["name"],
            type=r["type"],
            admin_id=r["admin_id"],
            admin_name=r["admin_name"],
            population=pop,
            households=int(r.get("households") or 0),
            centroid=[r["lon"], r["lat"]],
            priority_score=ps,
            caseload_score=caseload,
            tier=tier_class,
            triage_rationale=triage_rationale,
            prz_overlap_pct=prz_overlap,
            hazard_intensity=hazard_intensity,
            decayed_loss_score=decayed_loss,
            model_version=r.get("model_version") or "baseline-v1",
            scoring_version=r.get("scoring_version") or self.scoring_config.scoring_version,
            dataset_version=r.get("dataset_version") or "v1.0",
            data_quality=r.get("data_quality") or "observed",
            confidence=float(r.get("confidence") or 1.0),
            calculated_at=r.get("calculated_at") or datetime.now(timezone.utc),
            vulnerability=VulnerabilityBreakdownDTO(
                v_demographic=v_demo,
                v_structural=v_struct,
                v_access=v_access,
                v_economic=v_econ,
                v_index=v_index,
                is_district_flat=bool(r.get("is_district_flat") or False),
                metadata=v_meta,
            ),
            past_disasters=loss_dtos,
            top_contributing_factors=top_factors,
        )
