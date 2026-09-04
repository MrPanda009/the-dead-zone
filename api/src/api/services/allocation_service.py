"""Service layer for Habitation Relocation Allocation Solver (Day 6).

Section refs: docs/PRD1.md §6.9, §14.1 (FR-8.1, FR-8.2, FR-8.3)
"""

from __future__ import annotations

import json
import logging
import uuid
from typing import Any, Optional, Sequence
from sqlalchemy.orm import Session

from api.repositories.allocation_repo import AllocationRepository
from core.constants import SCREENING_GRADE_NOTICE
from core.domain.allocation import (
    AllocationConfig,
    CandidateSiteCapacity,
    HabitationDemand,
    HabitationSiteDistance,
    MinCostFlowAllocationSolver,
)
from core.domain.capacity import CapacityEngine, CandidateSitePolicy
from core.enums import Tier
from core.errors import InvalidParametersError
from core.schemas.allocation import (
    AllocationAssignmentDTO,
    AllocationPlanRequest,
    AllocationPlanResponse,
)

logger = logging.getLogger("setu_api.allocation_service")


class AllocationService:
    """Orchestrates habitation-to-site min-cost flow relocation optimization."""

    def __init__(
        self,
        db: Session,
        capacity_engine: Optional[CapacityEngine] = None,
        policy: Optional[CandidateSitePolicy] = None,
    ) -> None:
        self.repo = AllocationRepository(db)
        self.capacity_engine = capacity_engine or CapacityEngine()
        self.policy = policy or CandidateSitePolicy()

    def _filter_eligible_candidates(
        self,
        site_rows: Sequence[dict[str, Any]],
        distance_rows: Sequence[dict[str, Any]],
        max_search_radius_km: float = 15.0,
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        """Enforces H7 candidate-site eligibility rules before allocation (PRD §6.8, FR-7.2, FR-7.3).
        
        Guarantees that NO candidate site reaching allocation can violate ANY hard H7 eligibility constraint:
        - static MHI < 0.25
        - slope < 15°
        - not forest (missing/unknown -> rejected)
        - not protected area (missing/unknown -> rejected)
        - not CRZ (missing/unknown -> rejected)
        - not water body (missing/unknown -> rejected)
        - contiguous area >= 2 ha
        - within search radius (missing/unknown -> rejected)
        - tenure explicitly valid (government_revenue or private; unverified/unknown -> rejected)
        """
        eligible_sites: list[dict[str, Any]] = []
        eligible_site_ids: set[int] = set()

        site_min_dist: dict[int, float] = {}
        for d in distance_rows:
            s_id = d["site_id"]
            dist = float(d["distance_km"])
            if s_id not in site_min_dist or dist < site_min_dist[s_id]:
                site_min_dist[s_id] = dist

        policy = CandidateSitePolicy(search_radius_km=max_search_radius_km)

        def _parse_bool(val: Any) -> Optional[bool]:
            if val is None:
                return None
            if isinstance(val, bool):
                return val
            if isinstance(val, str):
                low = val.lower().strip()
                if low in ("true", "1", "yes"):
                    return True
                if low in ("false", "0", "no"):
                    return False
                return None
            if isinstance(val, (int, float)):
                if val == 1:
                    return True
                if val == 0:
                    return False
                return None
            return None

        for s in site_rows:
            s_id = s.get("id")
            if s_id is None:
                continue

            meta = s.get("metadata") or s.get("metadata_info") or {}
            if isinstance(meta, str):
                try:
                    meta = json.loads(meta)
                except Exception:
                    meta = {}
            if not isinstance(meta, dict):
                meta = {}

            mhi_val = s.get("mhi_max") if "mhi_max" in s else s.get("mhi_static")
            slope_val = s.get("slope_mean") if "slope_mean" in s else s.get("slope")
            area_val = s.get("area_ha") if "area_ha" in s else s.get("area")
            tenure_val = s.get("tenure")

            # Extract environmental exclusions (never assume missing is False / safe)
            raw_forest = s.get("is_forest")
            if raw_forest is None:
                raw_forest = s.get("forest")
            if raw_forest is None:
                raw_forest = meta.get("is_forest") if "is_forest" in meta else meta.get("forest")
            is_forest = _parse_bool(raw_forest)

            raw_protected = s.get("is_protected_area")
            if raw_protected is None:
                raw_protected = s.get("protected_area") if "protected_area" in s else s.get("protected")
            if raw_protected is None:
                raw_protected = (
                    meta.get("is_protected_area")
                    if "is_protected_area" in meta
                    else (meta.get("protected_area") if "protected_area" in meta else meta.get("protected"))
                )
            is_protected = _parse_bool(raw_protected)

            raw_crz = s.get("is_crz")
            if raw_crz is None:
                raw_crz = s.get("crz")
            if raw_crz is None:
                raw_crz = meta.get("is_crz") if "is_crz" in meta else meta.get("crz")
            is_crz = _parse_bool(raw_crz)

            raw_water = s.get("is_water_body")
            if raw_water is None:
                raw_water = s.get("water_body") if "water_body" in s else s.get("water")
            if raw_water is None:
                raw_water = (
                    meta.get("is_water_body")
                    if "is_water_body" in meta
                    else (meta.get("water_body") if "water_body" in meta else meta.get("water"))
                )
            is_water = _parse_bool(raw_water)

            dist_km = site_min_dist.get(s_id)

            eval_res = self.capacity_engine.evaluate_site_eligibility(
                mhi_max=mhi_val,
                slope_mean=slope_val,
                area_ha=area_val,
                tenure=tenure_val,
                is_forest=is_forest,
                is_protected_area=is_protected,
                is_crz=is_crz,
                is_water_body=is_water,
                distance_km=dist_km,
                require_distance=True,
                policy=policy,
            )

            if eval_res.is_eligible:
                eligible_sites.append(s)
                eligible_site_ids.add(s_id)
            else:
                logger.info(
                    f"Rejecting candidate site {s_id} from allocation: {eval_res.exclusion_reasons}"
                )

        filtered_distances = [
            d for d in distance_rows
            if d["site_id"] in eligible_site_ids and float(d["distance_km"]) <= max_search_radius_km
        ]

        return eligible_sites, filtered_distances

    def generate_allocation_plan(
        self,
        request: AllocationPlanRequest,
    ) -> AllocationPlanResponse:
        """Executes min-cost flow solver and persists relocation assignments."""
        # 1. Validate search radius & parameters
        if request.max_search_radius_km <= 0.0 or request.max_search_radius_km > 100.0:
            raise InvalidParametersError(
                f"Search radius {request.max_search_radius_km} km is outside valid range (0, 100]."
            )

        if not request.target_tiers:
            raise InvalidParametersError("At least one target triage tier must be specified for allocation.")

        # 2. Query eligible habitations
        target_tier_strings = [t.value if isinstance(t, Tier) else str(t) for t in request.target_tiers]
        hab_rows = self.repo.get_habitations_for_allocation(
            admin_id=request.admin_id,
            target_tiers=target_tier_strings,
        )

        hab_demands: list[HabitationDemand] = []
        for r in hab_rows:
            try:
                tier_enum = Tier(r.get("tier") or "short_term")
            except ValueError:
                tier_enum = Tier.SHORT_TERM

            hab_demands.append(
                HabitationDemand(
                    id=r["id"],
                    name=r["name"],
                    demand_households=int(r["households"]),
                    priority_score=float(r.get("priority_score") if r.get("priority_score") is not None else 0.5),
                    tier=tier_enum,
                    lat=r.get("lat"),
                    lon=r.get("lon"),
                )
            )

        # 3. Query candidate sites within search radius
        hab_ids = [h.id for h in hab_demands]
        raw_site_rows, raw_distance_rows = self.repo.get_candidate_sites_and_distances(
            habitation_ids=hab_ids,
            max_radius_m=request.max_search_radius_km * 1000.0,
        )

        site_rows, distance_rows = self._filter_eligible_candidates(
            site_rows=raw_site_rows,
            distance_rows=raw_distance_rows,
            max_search_radius_km=request.max_search_radius_km,
        )

        site_capacities: list[CandidateSiteCapacity] = [
            CandidateSiteCapacity(
                id=s["id"],
                name=s["name"],
                capacity_households=int(s["capacity"]),
                suitability=int(s.get("suitability") if s.get("suitability") is not None else 50),
                lat=s.get("lat"),
                lon=s.get("lon"),
            )
            for s in site_rows
        ]

        distances: list[HabitationSiteDistance] = [
            HabitationSiteDistance(
                habitation_id=d["habitation_id"],
                site_id=d["site_id"],
                distance_km=float(d["distance_km"]),
            )
            for d in distance_rows
        ]

        # 4. Configure and run OR-Tools solver
        solver_config = AllocationConfig(
            max_search_radius_km=request.max_search_radius_km,
            distance_penalty_weight=request.distance_penalty_weight,
            allow_group_splits=request.allow_group_splits,
        )
        solver = MinCostFlowAllocationSolver(solver_config)
        result = solver.solve(hab_demands, site_capacities, distances)

        # 5. Build DTO assignments
        run_id = uuid.uuid4()
        dto_assignments: list[AllocationAssignmentDTO] = []
        raw_assignments_to_save: list[dict] = []

        for a in result.assignments:
            dto_assignments.append(
                AllocationAssignmentDTO(
                    habitation_id=a.habitation_id,
                    habitation_name=a.habitation_name,
                    site_id=a.site_id,
                    site_distance_km=a.site_distance_km,
                    households=a.households,
                    tier=a.tier,
                    priority_score=round(a.priority_score, 4),
                    site_suitability=a.site_suitability,
                    has_group_split=a.has_group_split,
                    split_details=a.split_details,
                )
            )
            raw_assignments_to_save.append({
                "habitation_id": a.habitation_id,
                "site_id": a.site_id,
                "households": a.households,
                "tier": a.tier.value if isinstance(a.tier, Tier) else str(a.tier),
                "priority_score": a.priority_score,
                "site_distance_km": a.site_distance_km,
                "has_group_split": a.has_group_split,
                "split_details": a.split_details,
            })

        # 6. Persist allocation run in database
        try:
            self.repo.save_allocation_run(
                run_id=run_id,
                admin_id=request.admin_id,
                solver_latency_ms=result.solver_latency_ms,
                total_relocated=result.total_relocated_households,
                assignments=raw_assignments_to_save,
            )
        except Exception as e:
            logger.warning(f"Failed to persist allocation run in database: {e}")

        return AllocationPlanResponse(
            allocation_run_id=run_id,
            status=result.status,
            admin_id=request.admin_id,
            total_demand_households=result.total_demand_households,
            total_relocated_households=result.total_relocated_households,
            unmet_demand_households=result.unmet_demand_households,
            solver_latency_ms=result.solver_latency_ms,
            assignments=dto_assignments,
            group_split_warnings=result.group_split_warnings,
            screening_grade=SCREENING_GRADE_NOTICE,
        )

    def simulate_allocation(
        self,
        simulated_demands: list[HabitationDemand],
        max_search_radius_km: float = 15.0,
        distance_penalty_weight: float = 1.0,
        allow_group_splits: bool = True,
    ) -> AllocationResult:
        """Executes pure in-memory OR-Tools min-cost flow allocation simulation.
        
        Guarantees ZERO database mutation or persistence (Day 7 instruction #4).
        Reuses existing candidate-site capacities, eligibility, distances, and solver logic.
        """
        if not simulated_demands:
            return AllocationResult(
                status="COMPLETED",
                solver_status="OPTIMAL",
                total_demand_households=0,
                total_relocated_households=0,
                unmet_demand_households=0,
                solver_latency_ms=0.0,
                assignments=[],
                group_split_warnings=[],
            )

        hab_ids = [h.id for h in simulated_demands]
        raw_site_rows, raw_distance_rows = self.repo.get_candidate_sites_and_distances(
            habitation_ids=hab_ids,
            max_radius_m=max_search_radius_km * 1000.0,
        )

        site_rows, distance_rows = self._filter_eligible_candidates(
            site_rows=raw_site_rows,
            distance_rows=raw_distance_rows,
            max_search_radius_km=max_search_radius_km,
        )

        site_capacities: list[CandidateSiteCapacity] = [
            CandidateSiteCapacity(
                id=s["id"],
                name=s["name"],
                capacity_households=int(s["capacity"]),
                suitability=int(s.get("suitability") if s.get("suitability") is not None else 50),
                lat=s.get("lat"),
                lon=s.get("lon"),
            )
            for s in site_rows
        ]

        distances: list[HabitationSiteDistance] = [
            HabitationSiteDistance(
                habitation_id=d["habitation_id"],
                site_id=d["site_id"],
                distance_km=float(d["distance_km"]),
            )
            for d in distance_rows
        ]

        solver_config = AllocationConfig(
            max_search_radius_km=max_search_radius_km,
            distance_penalty_weight=distance_penalty_weight,
            allow_group_splits=allow_group_splits,
        )
        solver = MinCostFlowAllocationSolver(solver_config)
        return solver.solve(simulated_demands, site_capacities, distances)

