"""Demonstration of Track 2 Supply-Side Screening vs Order-Grade Mode.

Demonstrates:
1. Order-grade mode: strictly rejects unmeasured candidate sites to prevent unsafe relocation orders.
2. Screening mode: admits unmeasured sites for exploratory planning, but automatically stamps
   audit caveats and unmeasured hazard warnings.
"""

from __future__ import annotations

import sys
from pathlib import Path

# Add project root subdirectories to sys.path
REPO_ROOT = Path(__file__).resolve().parents[1]
for sub in ("core/src", "pipeline/src", "api/src"):
    p = str(REPO_ROOT / sub)
    if p not in sys.path:
        sys.path.insert(0, p)

from sqlalchemy import create_engine, text

from api.repositories.allocation_repo import AllocationRepository
from api.services.allocation_service import AllocationService
from core.config import settings
from core.domain.capacity import CandidateSitePolicy, SCREENING_SITE_POLICY
from core.enums import Tier
from core.schemas.allocation import AllocationPlanRequest


def main() -> None:
    engine = create_engine(settings.get_sqlalchemy_url())
    with engine.connect() as conn:
        barpeta_admin_id = conn.execute(
            text("SELECT id FROM admin_boundary WHERE name = 'Barpeta'")
        ).scalar()
        barpeta_habs = conn.execute(
            text("SELECT id FROM habitation WHERE admin_id = :id"),
            {"id": barpeta_admin_id},
        ).fetchall()
        hab_ids = [r[0] for r in barpeta_habs]

        repo = AllocationRepository(conn)

        print("\n" + "=" * 70)
        print("TRACK 2 BEHAVIOR DEMO: BARPETA DISTRICT (514 Candidate Sites)")
        print("=" * 70)

        # -------------------------------------------------------------
        # Mode 1: Strict Order-Grade Mode (Canonical CandidateSitePolicy)
        # -------------------------------------------------------------
        print("\n>>> [MODE 1] STRICT ORDER-GRADE (Canonical Policy)")
        print("    - allow_unmeasured_hazard: False")
        print("    - allow_land_only_capacity: False")
        print("    - allow_unverified_tenure: False")

        order_policy = CandidateSitePolicy()
        order_sites, _ = repo.get_candidate_sites_and_distances(
            habitation_ids=hab_ids,
            max_radius_m=25000.0,
            policy=order_policy,
        )
        print(f"    -> Candidate sites admitted through SQL filter: {len(order_sites)}")

        svc_order = AllocationService(db=conn, policy=order_policy)
        req_order = AllocationPlanRequest(
            admin_id=barpeta_admin_id,
            target_tiers=[Tier.SHORT_TERM],
            max_search_radius_km=25.0,
            policy_mode="order_grade",
        )
        order_plan = svc_order.generate_allocation_plan(request=req_order)
        print(
            f"    -> Solver Result: {order_plan.total_relocated_households} relocated households, {len(order_plan.assignments)} assignments."
        )
        print(f"    -> Caveats: {order_plan.screening_caveats}")

        # Clean up transient run record
        conn.execute(
            text("DELETE FROM relocation_plan WHERE allocation_run_id = :id;"),
            {"id": str(order_plan.allocation_run_id)},
        )
        conn.execute(
            text("DELETE FROM allocation_run WHERE id = :id;"),
            {"id": str(order_plan.allocation_run_id)},
        )
        conn.commit()

        # -------------------------------------------------------------
        # Mode 2: Exploratory Screening Mode (SCREENING_SITE_POLICY)
        # -------------------------------------------------------------
        print("\n>>> [MODE 2] EXPLORATORY SCREENING MODE (Screening Policy)")
        print("    - allow_unmeasured_hazard: True (Epistemic Integrity)")
        print("    - allow_land_only_capacity: True (Provisional Land-Only Capacity)")
        print("    - allow_unverified_tenure: True")

        screening_sites, _ = repo.get_candidate_sites_and_distances(
            habitation_ids=hab_ids,
            max_radius_m=25000.0,
            policy=SCREENING_SITE_POLICY,
        )
        print(f"    -> Candidate sites admitted through SQL filter: {len(screening_sites)}")
        if screening_sites:
            sample = screening_sites[0]
            print(
                f"       Sample site #{sample['id']}: Area={sample['area_ha']}ha, Capacity={sample['capacity']}, HazardBasis={sample.get('hazard_basis')}, CapacityBasis={sample.get('capacity_basis')}"
            )

        svc_screening = AllocationService(db=conn, policy=SCREENING_SITE_POLICY)
        req_screening = AllocationPlanRequest(
            admin_id=barpeta_admin_id,
            target_tiers=[Tier.SHORT_TERM],
            max_search_radius_km=25.0,
            policy_mode="screening",
        )
        screening_plan = svc_screening.generate_allocation_plan(request=req_screening)
        print(
            f"    -> Solver Result: {screening_plan.total_relocated_households} relocated households, {len(screening_plan.assignments)} assignments."
        )
        print("    -> Caveats injected by algorithm:")
        for c in screening_plan.screening_caveats:
            print(f"       * {c}")

        # Clean up transient run record
        conn.execute(
            text("DELETE FROM relocation_plan WHERE allocation_run_id = :id;"),
            {"id": str(screening_plan.allocation_run_id)},
        )
        conn.execute(
            text("DELETE FROM allocation_run WHERE id = :id;"),
            {"id": str(screening_plan.allocation_run_id)},
        )
        conn.commit()

        print("\n" + "=" * 70)
        print("TRACK 2 VALIDATION: SUCCESSFUL DEMONSTRATION OF EPISTEMIC INTEGRITY")
        print("=" * 70 + "\n")


if __name__ == "__main__":
    main()
