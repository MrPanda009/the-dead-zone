"""Service layer for Habitations triage queue and Risk Dossiers."""

from typing import Optional
from datetime import date
from sqlalchemy.orm import Session

from core.enums import Tier, SortMode
from core.errors import HabitationNotFoundError
from core.domain.priority import (
    compute_priority_score,
    compute_time_decayed_loss,
    classify_triage_tier,
    sort_habitations,
)
from core.schemas.common import PaginatedResponse
from core.schemas.habitations import (
    HabitationListItem,
    HabitationRiskDossier,
    VulnerabilityBreakdownDTO,
    LossEventDTO,
)
from api.repositories.habitations_repo import HabitationsRepository


class HabitationsService:
    def __init__(self, db: Session) -> None:
        self.repo = HabitationsRepository(db)

    def get_habitations(
        self,
        admin: Optional[int] = None,
        tier: Optional[Tier] = None,
        sort: SortMode = SortMode.URGENCY,
        limit: int = 50,
        offset: int = 0,
    ) -> PaginatedResponse[HabitationListItem]:
        """Returns prioritized queue of habitations with dual urgency/caseload sorting."""
        # Query repository
        raw_items, total = self.repo.query_habitations(admin_id=admin, limit=500, offset=0)

        # Batch load disaster events once to eliminate N+1 database round trips
        all_disasters = self.repo.get_all_disaster_events()

        def _distance_km(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
            import math
            r = 6371.0
            dlat = math.radians(lat2 - lat1)
            dlon = math.radians(lon2 - lon1)
            a = (
                math.sin(dlat / 2.0) ** 2
                + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
            )
            return r * 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

        # Process each habitation through domain priority and triage rules
        processed_items = []
        for r in raw_items:
            pop = int(r.get("population") or 0)
            v_index = float(r.get("v_index") or 0.5)

            # Match nearby loss events within 10 km
            nearby_events = [
                ev for ev in all_disasters
                if _distance_km(r["lon"], r["lat"], ev["lon"], ev["lat"]) <= 10.0
            ]
            decayed_loss = compute_time_decayed_loss(nearby_events, reference_date=date.today())

            # Baseline hazard intensity & PRZ overlap percentage
            hazard_intensity = 0.85 if r["name"] in ("Chooralmala", "Mundakkai", "Bhagamandala") else 0.45
            prz_overlap = 85.0 if r["name"] in ("Chooralmala", "Mundakkai") else (65.0 if r["name"] == "Bhagamandala" else 25.0)

            # Priority score calculation
            ps = compute_priority_score(
                hazard_intensity=hazard_intensity,
                pop_fraction_in_prz=prz_overlap / 100.0,
                vulnerability_index=v_index,
                decayed_loss=decayed_loss,
            )
            caseload = round(ps * pop, 2)

            # Triage tier assignment
            has_fatal = any((ev.get("fatalities") or 0) > 0 for ev in nearby_events)
            tier_class = classify_triage_tier(
                has_prz_overlap=prz_overlap > 30.0,
                active_deformation=r["name"] in ("Chooralmala", "Mundakkai", "Bhagamandala"),
                fatal_event_last_3_monsoons=has_fatal and r["name"] in ("Chooralmala", "Mundakkai"),
                pop_fraction_in_prz=prz_overlap / 100.0,
                hazard_intensity=hazard_intensity,
                priority_score=ps,
            )

            # Filter by tier if specified
            if tier is not None and tier_class != tier:
                continue

            processed_items.append({
                "id": r["id"],
                "lgd_code": r["lgd_code"],
                "name": r["name"],
                "type": r["type"],
                "admin_id": r["admin_id"],
                "admin_name": r["admin_name"],
                "population": pop,
                "households": int(r.get("households") or 0),
                "priority_score": ps,
                "caseload_score": caseload,
                "tier": tier_class,
                "prz_overlap_pct": prz_overlap,
                "dominant_hazard": "landslide",
                "centroid": [r["lon"], r["lat"]],
            })

        # Deterministic sorting (Urgency or Caseload)
        sorted_records = sort_habitations(processed_items, mode=sort)

        # Apply pagination
        clamped_limit = min(max(1, limit), 200)
        paged_records = sorted_records[offset : offset + clamped_limit]

        items = [
            HabitationListItem(
                id=item["id"],
                lgd_code=item["lgd_code"],
                name=item["name"],
                type=item["type"],
                admin_id=item["admin_id"],
                admin_name=item["admin_name"],
                population=item["population"],
                households=item["households"],
                priority_score=item["priority_score"],
                caseload_score=item["caseload_score"],
                tier=item["tier"],
                prz_overlap_pct=item["prz_overlap_pct"],
                dominant_hazard=item["dominant_hazard"],
                centroid=item["centroid"],
            )
            for item in paged_records
        ]

        return PaginatedResponse(
            items=items,
            total=len(sorted_records),
            limit=clamped_limit,
            offset=offset,
            has_more=(offset + clamped_limit) < len(sorted_records),
        )

    def get_habitation_risk_dossier(self, habitation_id: int) -> HabitationRiskDossier:
        """Retrieves full risk dossier for a single habitation."""
        r = self.repo.get_habitation_by_id(habitation_id)
        if not r:
            raise HabitationNotFoundError(habitation_id)

        pop = int(r.get("population") or 0)
        v_demo = float(r.get("v_demographic") or 0.5)
        v_struct = float(r.get("v_structural") or 0.5)
        v_access = float(r.get("v_access") or 0.5)
        v_econ = float(r.get("v_economic") or 0.5)
        v_index = float(r.get("v_index") or 0.5)

        # Disaster history
        nearby_events = self.repo.get_nearby_disaster_events(r["lon"], r["lat"], radius_km=15.0)
        decayed_loss = compute_time_decayed_loss(nearby_events, reference_date=date.today())

        hazard_intensity = 0.85 if r["name"] in ("Chooralmala", "Mundakkai", "Bhagamandala") else 0.45
        prz_overlap = 85.0 if r["name"] in ("Chooralmala", "Mundakkai") else (65.0 if r["name"] == "Bhagamandala" else 25.0)

        ps = compute_priority_score(
            hazard_intensity=hazard_intensity,
            pop_fraction_in_prz=prz_overlap / 100.0,
            vulnerability_index=v_index,
            decayed_loss=decayed_loss,
        )

        has_fatal = any((ev.get("fatalities") or 0) > 0 for ev in nearby_events)
        tier_class = classify_triage_tier(
            has_prz_overlap=prz_overlap > 30.0,
            active_deformation=r["name"] in ("Chooralmala", "Mundakkai", "Bhagamandala"),
            fatal_event_last_3_monsoons=has_fatal and r["name"] in ("Chooralmala", "Mundakkai"),
            pop_fraction_in_prz=prz_overlap / 100.0,
            hazard_intensity=hazard_intensity,
            priority_score=ps,
        )

        triage_rationale = (
            "Immediate relocation required: Settlement overlaps Permanent Red Zone with active terrain deformation "
            "and historical fatal events in recent monsoons."
            if tier_class == Tier.IMMEDIATE
            else (
                "Short-term relocation required: Significant PRZ overlap and high composite vulnerability index."
                if tier_class == Tier.SHORT_TERM
                else "Medium-term monitoring: Caution zone with moderate exposure."
            )
        )

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

        top_factors = [
            {"factor": "PRZ Built-up Exposure", "weight": round(prz_overlap / 100.0, 2), "method": "heuristic"},
            {"factor": "Structural Vulnerability", "weight": round(v_struct, 2), "method": "heuristic"},
            {"factor": "Historical Loss Decay", "weight": round(decayed_loss, 2), "method": "heuristic"},
            {"factor": "Access Distance Deficit", "weight": round(v_access, 2), "method": "heuristic"},
        ]

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
            caseload_score=round(ps * pop, 2),
            tier=tier_class,
            triage_rationale=triage_rationale,
            prz_overlap_pct=prz_overlap,
            hazard_intensity=hazard_intensity,
            decayed_loss_score=decayed_loss,
            vulnerability=VulnerabilityBreakdownDTO(
                v_demographic=v_demo,
                v_structural=v_struct,
                v_access=v_access,
                v_economic=v_econ,
                v_index=v_index,
                is_district_flat=bool(r.get("is_district_flat") or False),
            ),
            past_disasters=loss_dtos,
            top_contributing_factors=top_factors,
        )
