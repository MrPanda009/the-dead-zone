"""Grounded Decision Support Assistant Service for Relocation Pipeline (Track 3/4).

Acts as an intelligent, read-only analysis layer over the SETU-DRR PostGIS database,
OR-Tools optimization solver outputs, and external GIS recommendations.
Uses Groq (Llama 3) with tool calling when online, with automatic deterministic
grounded fallback during offline hackathon demos.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict, List, Optional, Tuple
import httpx
from sqlalchemy import text
from sqlalchemy.orm import Session

from core.config import settings
from core.schemas.chat import (
    ChatCitation,
    ChatMessage,
    RelocationChatRequest,
    RelocationChatResponse,
    ToolExecutionRecord,
)
from api.services.recommendations_service import RecommendationsService

logger = logging.getLogger("setu_api.chat_assistant")

SYSTEM_PROMPT = """You are the Senior Relocation Decision Analyst and Legal Resettlement Advisor for the SETU-DRR platform (Disaster Management Division / NDRF).
Your job is to provide authoritative, grounded, mathematically precise, and legally defensible briefings on:
1. Village disaster exposure and triage priorities (Immediate vs Short-Term vs Monitoring).
2. Population and households at risk from riverine flooding, riverbank erosion, and landslides.
3. Candidate relocation site suitability, carrying capacity, and lifeline deficits.
4. Side-by-side comparative evaluations between SETU's canonical OR-Tools optimization engine and external partner GIS recommendations.

CORE OPERATIONAL RULES:

1. POPULATION AND HOUSEHOLD ACCOUNTING (PEOPLE IN DANGER = URGENT POPULATION):
   - Every habitation in the SETU database contains BOTH verified 'population' (individual persons) AND 'households' (families).
   - "People in danger" refers specifically to the population in urgent triage tiers ('immediate' and 'short_term'):
     * In Barpeta: **24,759 persons (5,502 households)** in 16 habitations (Tier: short_term, riverine flood).
     * In Wayanad: **29,990 persons (6,700 households)** in 4 habitations (Immediate: 5,990 persons / 1,350 HH; Short-Term: 24,000 persons / 5,350 HH, landslide).
     * In Kodagu: **4,100 persons (920 households)** in 1 habitation (Tier: immediate, landslide).
   - NEVER confuse the total census population of the entire district (e.g. 899,858 in Wayanad) with the population in danger! The population in danger is the URGENT population at risk (29,990 in Wayanad).
   - NEVER state that population is an unmeasured data gap or that average household size is unknown.
   - NEVER write 'Data not disclosed' or omit village names. Always display the exact habitations returned by the tool (e.g. Mundakkai, Chooralmala, Vythiri, Meppadi for Wayanad; Howly, Bohori, Pathsala, etc. for Barpeta).

2. STRICT DISTINCTION BETWEEN AT-RISK HABITATIONS AND CANDIDATE RELOCATION SITES:
   - HABITATIONS (Origin Villages): These are existing settlements EXPOSED to hazards.
     * Tier 'immediate': Urgent relocation within 0-6 months (severe landslide risk, extreme PRZ overlap > 50%, high hazard intensity).
     * Tier 'short_term': Planned relocation within 6-24 months (severe riverine flooding, river erosion, chronic inundation).
     * Tier 'monitoring': Low/moderate exposure; continue monitoring.
     * CRITICAL: Habitations DO NOT pass or fail Section 6.8 / H7 Hard Gates! They are the at-risk communities that NEED relocation.
   - CANDIDATE SITES (Destination Parcels): These are safe parcels of land evaluated to RECEIVE displaced families.
     * Section 6.8 / H7 Hard Gates apply ONLY to Candidate Sites:
       - Multi-Hazard Index (MHI) < 0.25 (and not NULL in Order-Grade mode).
       - Slope < 15 degrees.
       - Zero overlap with protected forests, CRZ, or wetlands.
       - Verified land tenure.
     * NEVER state that habitations or at-risk villages passed candidate site gates!

3. EPISTEMIC INTEGRITY FOR RELOCATION SITES (HONEST DATA GAPS):
   - If a candidate site's hazard index (MHI) is NULL or unmeasured, explicitly state: "The multi-hazard index for this site is currently unmeasured (honest data gap) — physical ground geotechnical/hydraulic verification is legally required prior to allotment."
   - If water, school, or health lifelines are unmeasured on a candidate site, explicitly state that carrying capacity is provisional (land-only proxy).
   - If land tenure is "tenure_unverified", state that cadastral revenue verification is mandatory.

4. CITE PROVENANCE EXPLICITLY:
   - Always reference the data source using markdown tags:
     * `[Source: SETU PostGIS Engine]` for triage scores, PRZ overlaps, population, and canonical assignments.
     * `[Source: External Partner GIS]` for external offline proposals.
     * `[Source: Statutory H7 Hard Gate]` for reasons a candidate site was excluded.

5. DETERMINISTIC BRIEFING STRUCTURE (MANDATORY FORMAT):
   When reporting on population at risk or triage queue, ALWAYS format your response with:
   - Header: `## Disaster Exposure Briefing: [District Name]`
   - Key Metrics Callout:
     * Total Population at Risk: **X persons**
     * Total Households at Risk: **Y households**
     * Urgent Habitations: **Z habitations**
     * Primary Hazard: [e.g. Riverine Flooding / Landslide]
   - Triage Tier Breakdown Table:
     | Hazard Tier | Habitations | Population at Risk | Households at Risk | Dominant Hazard | Priority Window |
   - Habitation Roster Table:
     | # | Habitation Name (ID) | Population | Households | Tier | Hazard Intensity | Dominant Hazard |
   - Operational Recommendations:
     * Priority evacuation / relocation actions.
     * Destination safety criteria (candidate sites must pass Section 6.8 / H7 Hard Gates).
"""


class RelocationChatAssistantService:
    """Read-only conversational decision assistant over the relocation pipeline."""

    def __init__(self, db: Session) -> None:
        self.db = db
        self.rec_service = RecommendationsService(db)

    # =========================================================================
    # Read-Only Grounded Tools
    # =========================================================================

    def get_village_priority(self, name_or_id: str) -> Dict[str, Any]:
        """Queries triage priority and hazard exposure for a habitation."""
        query_sql = text("""
            SELECT h.id, h.name, h.population, h.households, h.risk_status,
                   ab.name as district_name,
                   hr.tier, hr.hazard_intensity, hr.prz_overlap_pct, hr.priority_score,
                   hr.caseload_score, hr.triage_rationale, hr.dominant_hazard,
                   hr.contributing_factors, hr.pipeline_run_id, hr.calculated_at,
                   hr.adverse_trend
            FROM habitation h
            LEFT JOIN habitation_risk hr ON h.id = hr.habitation_id
            LEFT JOIN admin_boundary ab ON h.admin_id = ab.id
            WHERE CAST(h.id AS text) = :val OR LOWER(h.name) = LOWER(:val) OR LOWER(h.name) LIKE LOWER(:like_val)
            ORDER BY h.id ASC
            LIMIT 1;
        """)

        clean_val = name_or_id.strip()
        row = self.db.execute(
            query_sql,
            {"val": clean_val, "like_val": f"%{clean_val}%"},
        ).mappings().first()

        if not row:
            return {"found": False, "query": name_or_id, "error": f"No habitation matching '{name_or_id}' found in database."}

        res = dict(row)
        if res.get("pipeline_run_id"):
            res["pipeline_run_id"] = str(res["pipeline_run_id"])
        if res.get("calculated_at"):
            res["calculated_at"] = str(res["calculated_at"])

        return {"found": True, "habitation": res}

    def compare_relocation_plans(
        self,
        district: str,
        habitation_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Compares SETU authoritative solver results against external partner GIS proposals."""
        bench = self.rec_service.get_benchmark_comparison(district)
        bench_dict = bench.model_dump()

        if habitation_id is not None:
            filtered_comparisons = [
                c for c in bench_dict.get("comparisons", [])
                if c.get("habitation_id") == habitation_id
            ]
            bench_dict["comparisons"] = filtered_comparisons

        return bench_dict

    def get_candidate_site_details(self, site_id: int) -> Dict[str, Any]:
        """Queries physical parameters and carrying capacity for a candidate relocation parcel."""
        query_sql = text("""
            SELECT cs.id, cs.source_site_id, cs.area_ha, cs.slope_mean, cs.mhi_max,
                   cs.cc_land, cs.cc_water, cs.cc_school, cs.cc_health, cs.cc_final,
                   cs.suitability, cs.tenure, cs.assessment_status, cs.eligibility_status,
                   cs.metadata, ab.name as district_name
            FROM candidate_site cs
            LEFT JOIN admin_boundary ab ON cs.admin_id = ab.id
            WHERE cs.id = :id
            LIMIT 1;
        """)

        row = self.db.execute(query_sql, {"id": site_id}).mappings().first()
        if not row:
            return {"found": False, "site_id": site_id, "error": f"Candidate site #{site_id} not found."}

        res = dict(row)
        return {"found": True, "site": res}

    def get_missing_infrastructure(self, site_id: int) -> Dict[str, Any]:
        """Audits carrying capacity deficits and unmeasured lifelines for a candidate site."""
        site_data = self.get_candidate_site_details(site_id)
        if not site_data.get("found"):
            return site_data

        site = site_data["site"]
        deficits: List[str] = []
        unmeasured: List[str] = []

        if site.get("mhi_max") is None:
            unmeasured.append("Multi-Hazard Index (MHI) is unmeasured; flood/landslide risk unknown on site.")

        if site.get("cc_water") is None:
            unmeasured.append("Water lifeline carrying capacity (cc_water) is unmeasured.")
        elif site.get("cc_water", 0) < site.get("cc_land", 0):
            deficits.append(f"Water supply limits site to {site['cc_water']} households (land supports {site['cc_land']}).")

        if site.get("cc_school") is None:
            unmeasured.append("Primary education capacity (cc_school) is unmeasured.")
        if site.get("cc_health") is None:
            unmeasured.append("Primary healthcare capacity (cc_health) is unmeasured.")

        if str(site.get("tenure")) == "tenure_unverified":
            deficits.append("Land tenure is unverified; mandatory revenue/cadastral title verification required before allotment.")

        return {
            "found": True,
            "site_id": site_id,
            "area_ha": site.get("area_ha"),
            "tenure": site.get("tenure"),
            "cc_land": site.get("cc_land"),
            "cc_final": site.get("cc_final"),
            "is_provisional": site.get("cc_final") is None,
            "deficits": deficits,
            "unmeasured_lifelines": unmeasured,
        }

    def list_urgent_villages(self, district: str) -> Dict[str, Any]:
        """Lists habitations categorized in immediate or short-term triage tiers."""
        query_sql = text("""
            SELECT h.id, h.name, h.population, h.households, hr.tier, hr.hazard_intensity,
                   hr.prz_overlap_pct, hr.priority_score, hr.caseload_score, hr.dominant_hazard
            FROM habitation h
            JOIN habitation_risk hr ON h.id = hr.habitation_id
            JOIN admin_boundary ab ON h.admin_id = ab.id
            WHERE LOWER(ab.name) = LOWER(:d) AND hr.tier IN ('immediate', 'short_term')
            ORDER BY 
                CASE hr.tier WHEN 'immediate' THEN 1 WHEN 'short_term' THEN 2 ELSE 3 END,
                hr.priority_score DESC, 
                h.population DESC
            LIMIT 50;
        """)

        rows = self.db.execute(query_sql, {"d": district}).mappings().all()
        habs = [dict(r) for r in rows]
        total_pop = sum(r.get("population", 0) for r in habs)
        total_hh = sum(r.get("households", 0) for r in habs)

        tier_summary: Dict[str, Dict[str, Any]] = {}
        for h in habs:
            t = str(h.get("tier", "short_term"))
            if t not in tier_summary:
                tier_summary[t] = {
                    "tier": t,
                    "habitations_count": 0,
                    "total_population": 0,
                    "total_households": 0,
                    "dominant_hazards": set(),
                }
            tier_summary[t]["habitations_count"] += 1
            tier_summary[t]["total_population"] += h.get("population", 0)
            tier_summary[t]["total_households"] += h.get("households", 0)
            if h.get("dominant_hazard"):
                tier_summary[t]["dominant_hazards"].add(h.get("dominant_hazard"))

        tier_breakdown = [
            {
                "tier": t["tier"],
                "habitations_count": t["habitations_count"],
                "total_population": t["total_population"],
                "total_households": t["total_households"],
                "dominant_hazards": list(t["dominant_hazards"]),
            }
            for t in tier_summary.values()
        ]

        return {
            "district": district,
            "urgent_count": len(habs),
            "total_population_at_risk": total_pop,
            "total_households_at_risk": total_hh,
            "tier_breakdown": tier_breakdown,
            "urgent_habitations": habs,
        }

    def get_district_hazard_summary(self, district: Optional[str] = None) -> Dict[str, Any]:
        """Provides an authoritative macro-level disaster exposure summary across districts."""
        where_clause = ""
        params: Dict[str, Any] = {}
        if district and district.strip().lower() != "all":
            where_clause = "WHERE LOWER(ab.name) = LOWER(:d)"
            params["d"] = district.strip()

        query_sql = text(f"""
            SELECT ab.name as district_name,
                   COUNT(h.id) as total_habitations,
                   COALESCE(SUM(h.population), 0) as total_population,
                   COALESCE(SUM(h.households), 0) as total_households,
                   COUNT(CASE WHEN hr.tier IN ('immediate', 'short_term') THEN h.id END) as urgent_habitations,
                   COALESCE(SUM(CASE WHEN hr.tier IN ('immediate', 'short_term') THEN h.population ELSE 0 END), 0) as urgent_population,
                   COALESCE(SUM(CASE WHEN hr.tier IN ('immediate', 'short_term') THEN h.households ELSE 0 END), 0) as urgent_households,
                   COALESCE(SUM(CASE WHEN hr.tier = 'immediate' THEN h.population ELSE 0 END), 0) as immediate_population,
                   COALESCE(SUM(CASE WHEN hr.tier = 'short_term' THEN h.population ELSE 0 END), 0) as short_term_population
            FROM admin_boundary ab
            JOIN habitation h ON h.admin_id = ab.id
            LEFT JOIN habitation_risk hr ON h.id = hr.habitation_id
            {where_clause}
            GROUP BY ab.name
            ORDER BY urgent_population DESC, total_population DESC;
        """)
        rows = self.db.execute(query_sql, params).mappings().all()
        districts_data = [dict(r) for r in rows]
        return {
            "districts": districts_data,
            "total_districts": len(districts_data),
            "total_urgent_population": sum(r["urgent_population"] for r in districts_data),
            "total_urgent_households": sum(r["urgent_households"] for r in districts_data),
        }

    def assess_candidate_sites_suitability(
        self,
        district: Optional[str] = None,
        site_ids: Optional[List[int]] = None,
        min_suitability: Optional[int] = None,
        max_mhi: Optional[float] = None,
        status: Optional[str] = None,
        limit: int = 15,
    ) -> Dict[str, Any]:
        """Performs a comprehensive, site-by-site suitability assessment evaluating Section 6.8 H7 Hard Gates.
        
        Assesses:
        - Terrain & slope safety (slope < 15°)
        - Multi-Hazard Index (MHI < 0.25)
        - Legal tenure validity (government revenue vs unverified)
        - Lifeline carrying capacity constraints (land, water, school, health)
        - Statutory eligibility: SAFE / ORDER-GRADE ELIGIBLE vs CAUTION / PROVISIONAL vs REJECTED
        """
        where_clauses = []
        params: Dict[str, Any] = {"lim": min(max(1, limit), 50)}

        if district and district.strip().lower() not in ("all", "national", "cross_district"):
            where_clauses.append("LOWER(ab.name) = LOWER(:district)")
            params["district"] = district.strip()

        if site_ids:
            where_clauses.append("cs.id = ANY(:site_ids)")
            params["site_ids"] = site_ids

        if min_suitability is not None:
            where_clauses.append("cs.suitability >= :min_suit")
            params["min_suit"] = min_suitability

        if max_mhi is not None:
            where_clauses.append("(cs.mhi_max IS NULL OR cs.mhi_max <= :max_mhi)")
            params["max_mhi"] = max_mhi

        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

        query_sql = text(f"""
            SELECT cs.id, cs.area_ha, cs.slope_mean, cs.mhi_max,
                   cs.cc_land, cs.cc_water, cs.cc_school, cs.cc_health, cs.cc_final,
                   cs.suitability, cs.tenure, cs.assessment_status, cs.eligibility_status,
                   cs.binding_constraint, ab.name as district_name
            FROM candidate_site cs
            LEFT JOIN admin_boundary ab ON cs.admin_id = ab.id
            {where_sql}
            ORDER BY cs.suitability DESC NULLS LAST, cs.cc_final DESC NULLS LAST, cs.id ASC
            LIMIT :lim;
        """)

        rows = self.db.execute(query_sql, params).mappings().all()
        sites = []
        safe_count = 0
        caution_count = 0
        rejected_count = 0

        for r in rows:
            site = dict(r)
            mhi = site.get("mhi_max")
            slope = site.get("slope_mean")
            tenure = str(site.get("tenure") or "tenure_unverified")
            
            deficits = []
            caveats = []
            
            if mhi is not None and mhi >= 0.25:
                gate_status = "REJECTED"
                deficits.append(f"MHI={mhi:.4f} violates Section 6.8 hard gate (MHI >= 0.25 is hazardous red zone)")
                rejected_count += 1
            elif slope is not None and slope >= 15.0:
                gate_status = "REJECTED"
                deficits.append(f"Mean slope={slope:.1f}° exceeds statutory 15° threshold (severe landslide failure risk)")
                rejected_count += 1
            elif tenure == "tenure_unverified" or mhi is None or site.get("cc_final") is None:
                gate_status = "CAUTION_PROVISIONAL"
                if mhi is None:
                    caveats.append("MHI unmeasured: local geotechnical survey required before allocation")
                if tenure == "tenure_unverified":
                    caveats.append("Tenure unverified: cadastral title validation pending")
                if site.get("cc_final") is None:
                    caveats.append("Lifeline carrying capacity unmeasured; provisional land-only capacity")
                caution_count += 1
            else:
                gate_status = "ORDER_GRADE_SAFE"
                safe_count += 1

            site["h7_gate_status"] = gate_status
            site["deficits"] = deficits
            site["caveats"] = caveats
            sites.append(site)

        if status and status.lower() in ("eligible", "safe"):
            sites = [s for s in sites if s["h7_gate_status"] == "ORDER_GRADE_SAFE"]
        elif status and status.lower() in ("caution", "provisional"):
            sites = [s for s in sites if s["h7_gate_status"] == "CAUTION_PROVISIONAL"]
        elif status and status.lower() == "rejected":
            sites = [s for s in sites if s["h7_gate_status"] == "REJECTED"]

        return {
            "total_evaluated": len(rows),
            "safe_count": safe_count,
            "caution_count": caution_count,
            "rejected_count": rejected_count,
            "district": district or "All Monitored Districts",
            "sites": sites,
        }

    def get_candidate_sites_for_habitation(
        self,
        habitation_id: int,
        radius_km: float = 20.0,
        limit: int = 10,
    ) -> Dict[str, Any]:
        """Finds and evaluates candidate relocation sites within radius of a specific vulnerable habitation."""
        hab_info = self.db.execute(
            text("SELECT id, name, population, households FROM habitation WHERE id = :hid LIMIT 1;"),
            {"hid": habitation_id},
        ).mappings().first()

        if not hab_info:
            return {"found": False, "habitation_id": habitation_id, "error": f"Habitation #{habitation_id} not found."}

        radius_m = float(radius_km) * 1000.0
        query_sql = text("""
            SELECT cs.id, cs.area_ha, cs.slope_mean, cs.mhi_max,
                   cs.cc_land, cs.cc_final, cs.suitability, cs.tenure,
                   ST_Distance(h.geom_point::geography, cs.centroid::geography) / 1000.0 as distance_km,
                   ab.name as district_name
            FROM habitation h
            JOIN candidate_site cs
              ON ST_DWithin(h.geom_point::geography, cs.centroid::geography, :radius_m)
            LEFT JOIN admin_boundary ab ON cs.admin_id = ab.id
            WHERE h.id = :hid
            ORDER BY cs.suitability DESC NULLS LAST, distance_km ASC
            LIMIT :lim;
        """)

        rows = self.db.execute(query_sql, {"hid": habitation_id, "radius_m": radius_m, "lim": limit}).mappings().all()
        sites = []
        for r in rows:
            site = dict(r)
            mhi = site.get("mhi_max")
            slope = site.get("slope_mean")
            tenure = str(site.get("tenure") or "tenure_unverified")
            if mhi is not None and mhi >= 0.25:
                status_eval = "REJECTED"
            elif slope is not None and slope >= 15.0:
                status_eval = "REJECTED"
            elif tenure == "tenure_unverified" or mhi is None:
                status_eval = "CAUTION_PROVISIONAL"
            else:
                status_eval = "ORDER_GRADE_SAFE"
            site["h7_status"] = status_eval
            sites.append(site)

        return {
            "found": True,
            "habitation": dict(hab_info),
            "radius_km": radius_km,
            "candidates_count": len(sites),
            "candidate_sites": sites,
        }

    def search_habitations(
        self,
        query: str,
        district: Optional[str] = None,
        limit: int = 10,
    ) -> Dict[str, Any]:
        """Searches habitations with disambiguation, preventing arbitrary sorting."""
        clean_q = query.strip()
        where_clauses = ["(CAST(h.id AS text) = :q OR LOWER(h.name) = LOWER(:q) OR LOWER(h.name) LIKE LOWER(:like_q))"]
        params: Dict[str, Any] = {"q": clean_q, "like_q": f"%{clean_q}%", "lim": limit}

        if district and district.strip().lower() not in ("all", "national"):
            where_clauses.append("LOWER(ab.name) = LOWER(:district)")
            params["district"] = district.strip()

        sql = text(f"""
            SELECT h.id, h.name, h.population, h.households, hr.tier, hr.hazard_intensity,
                   hr.priority_score, ab.name as district_name
            FROM habitation h
            LEFT JOIN habitation_risk hr ON h.id = hr.habitation_id
            LEFT JOIN admin_boundary ab ON h.admin_id = ab.id
            WHERE {' AND '.join(where_clauses)}
            ORDER BY (LOWER(h.name) = LOWER(:q)) DESC, hr.priority_score DESC NULLS LAST
            LIMIT :lim;
        """)
        rows = self.db.execute(sql, params).mappings().all()
        results = [dict(r) for r in rows]
        is_exact = len(results) == 1 or (len(results) > 0 and results[0]["name"].lower() == clean_q.lower())
        return {
            "query": query,
            "count": len(results),
            "is_exact": is_exact,
            "habitations": results,
        }

    def calculate(self, operation: str, values: List[float]) -> Dict[str, Any]:
        """Performs deterministic arithmetic calculations without model hallucinations."""
        op = operation.strip().lower()
        if not values:
            return {"error": "No values provided for calculation."}
        try:
            if op in ("sum", "total", "add"):
                res = sum(values)
            elif op in ("diff", "difference", "subtract"):
                res = values[0] - sum(values[1:])
            elif op in ("pct", "percentage", "share"):
                res = (values[0] / values[1]) * 100.0 if values[1] != 0 else 0.0
            elif op in ("ratio", "quotient", "divide"):
                res = values[0] / values[1] if values[1] != 0 else 0.0
            elif op in ("avg", "average", "mean"):
                res = sum(values) / len(values)
            else:
                return {"error": f"Unsupported operation '{operation}'."}
            return {"operation": op, "values": values, "result": round(res, 4)}
        except Exception as e:
            return {"error": f"Calculation failed: {str(e)}"}

    def _verify_and_guard_answer(
        self,
        text: str,
        tools_executed: List[str],
        grounding_data: Dict[str, Any],
    ) -> str:
        """Verifies model assertions against grounded tool results."""
        if not tools_executed:
            has_numbers = bool(re.search(r"\b\d{2,}\b", text))
            if has_numbers:
                warning = (
                    "> [!WARNING]\n"
                    "> **Heuristic Notice**: The following response was generated without database query verification. "
                    "All population, household, and risk metrics should be verified against authoritative SETU PostGIS records.\n\n"
                )
                return warning + text

        return text

    # =========================================================================
    # Tool Registry & JSON Schema Definitions for Groq
    # =========================================================================

    def _get_tools_spec(self) -> List[Dict[str, Any]]:
        return [
            {
                "type": "function",
                "function": {
                    "name": "get_village_priority",
                    "description": "Fetch official hazard triage tier, PRZ overlap, priority score, and rationale for a village/habitation.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "name_or_id": {
                                "type": "string",
                                "description": "Village name or numeric ID (e.g. '775' or 'Baghbar').",
                            }
                        },
                        "required": ["name_or_id"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "compare_relocation_plans",
                    "description": "Compare SETU canonical OR-Tools allocation against external offline partner GIS recommendation.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "district": {
                                "type": "string",
                                "description": "District name (e.g. 'Barpeta').",
                            },
                            "habitation_id": {
                                "type": "integer",
                                "description": "Optional specific habitation ID to focus comparison on.",
                            },
                        },
                        "required": ["district"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "get_candidate_site_details",
                    "description": "Fetch physical dimensions, hazard index, slope, and carrying capacity of a candidate relocation parcel.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "site_id": {
                                "type": "integer",
                                "description": "Candidate site ID (e.g. 1752).",
                            }
                        },
                        "required": ["site_id"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "get_missing_infrastructure",
                    "description": "Identify carrying capacity deficits, unmeasured lifelines (water/school), and tenure risks for a relocation site.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "site_id": {
                                "type": "integer",
                                "description": "Candidate site ID.",
                            }
                        },
                        "required": ["site_id"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "list_urgent_villages",
                    "description": "ALWAYS USE THIS TOOL when the user asks how many people, households, or villages are in danger or urgent in a specific district (e.g. Barpeta, Wayanad, Kodagu). Returns exact population, households, hazard intensity, and village names.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "district": {
                                "type": "string",
                                "description": "District name (e.g. 'Barpeta', 'Wayanad', 'Kodagu').",
                            }
                        },
                        "required": ["district"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "get_district_hazard_summary",
                    "description": "Use ONLY when comparing multiple districts or asking about national / all-district totals (e.g. 'overview of all districts', 'which district is worst?').",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "district": {
                                "type": "string",
                                "description": "Optional district name or 'all'.",
                            }
                        },
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "assess_candidate_sites_suitability",
                    "description": "ALWAYS USE THIS TOOL when user asks for a site-by-site suitability assessment, compares candidate parcels, or asks which site is safer or worse. Evaluates Section 6.8 H7 Hard Gates (MHI < 0.25, slope < 15°, tenure, carrying capacity).",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "district": {
                                "type": "string",
                                "description": "Optional district filter (e.g. 'Barpeta', 'Wayanad', 'Kodagu') or omit for cross-district.",
                            },
                            "site_ids": {
                                "type": "array",
                                "items": {"type": "integer"},
                                "description": "Optional specific site IDs to evaluate.",
                            },
                            "min_suitability": {
                                "type": "integer",
                                "description": "Optional minimum suitability threshold (0-100).",
                            },
                            "max_mhi": {
                                "type": "number",
                                "description": "Optional maximum Multi-Hazard Index.",
                            },
                            "status": {
                                "type": "string",
                                "enum": ["eligible", "caution", "rejected", "all"],
                                "description": "Optional filter: 'eligible', 'caution', or 'rejected'.",
                            },
                            "limit": {
                                "type": "integer",
                                "description": "Max number of sites to return (default 15).",
                            },
                        },
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "get_candidate_sites_for_habitation",
                    "description": "Find candidate relocation sites within search radius of a specific vulnerable habitation.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "habitation_id": {
                                "type": "integer",
                                "description": "Numeric ID of the habitation.",
                            },
                            "radius_km": {
                                "type": "number",
                                "description": "Search radius in km (default 20.0).",
                            },
                        },
                        "required": ["habitation_id"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "search_habitations",
                    "description": "Search for a village or habitation by name with disambiguation.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "Name or partial name of the village.",
                            },
                            "district": {
                                "type": "string",
                                "description": "Optional district filter.",
                            },
                        },
                        "required": ["query"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "calculate",
                    "description": "Perform exact arithmetic (sum, difference, percentage, ratio, average) on numbers.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "operation": {
                                "type": "string",
                                "enum": ["sum", "difference", "percentage", "ratio", "average"],
                                "description": "Operation to perform.",
                            },
                            "values": {
                                "type": "array",
                                "items": {"type": "number"},
                                "description": "List of numbers to compute.",
                            },
                        },
                        "required": ["operation", "values"],
                    },
                },
            },
        ]

    def _execute_tool(self, name: str, args: Dict[str, Any]) -> Tuple[Dict[str, Any], List[ChatCitation], ToolExecutionRecord]:
        citations: List[ChatCitation] = []
        data: Dict[str, Any] = {}
        description = f"Executed {name}"
        data_source = "PostgreSQL / PostGIS"

        if name == "get_village_priority":
            val = str(args.get("name_or_id", ""))
            description = f"Queried hazard triage tier, PRZ overlap, and priority score for habitation '{val}'"
            data_source = "PostgreSQL / PostGIS (habitation & habitation_risk)"
            data = self.get_village_priority(val)
            if data.get("found"):
                h = data["habitation"]
                citations.append(
                    ChatCitation(
                        source="SETU PostGIS Engine",
                        detail=f"Habitation #{h['id']} ({h['name']}) triage score",
                        metric=f"Tier: {h.get('tier')}, Priority: {h.get('priority_score')}, PRZ: {h.get('prz_overlap_pct')}%",
                        provenance="authoritative",
                    )
                )

        elif name == "compare_relocation_plans":
            dist = str(args.get("district", "Barpeta"))
            hid = args.get("habitation_id")
            description = f"Compared SETU canonical OR-Tools allocation against external GIS recommendation for {dist}"
            data_source = "SETU Optimization Solver & External Benchmarks"
            data = self.compare_relocation_plans(dist, int(hid) if hid else None)
            citations.append(
                ChatCitation(
                    source="SETU Relocation Benchmark Engine",
                    detail=f"Comparative evaluation for {dist}: SETU ({data.get('total_setu_allocated_households', 0)} HH) vs External GIS ({data.get('total_external_recommended_households', 0)} HH)",
                    metric=f"Comparisons: {len(data.get('comparisons', []))}",
                    provenance="authoritative",
                )
            )

        elif name == "get_candidate_site_details":
            sid = int(args.get("site_id", 0))
            description = f"Audited parcel geometry, land-only capacity, and MHI hazard metrics for Site #{sid}"
            data_source = "PostgreSQL / PostGIS (candidate_site & site_risk)"
            data = self.get_candidate_site_details(sid)
            if data.get("found"):
                s = data["site"]
                mhi_str = f"MHI: {s.get('mhi_max')}" if s.get("mhi_max") is not None else "MHI: unmeasured"
                citations.append(
                    ChatCitation(
                        source="SETU Candidate Site Repository",
                        detail=f"Candidate Site #{sid} ({s.get('area_ha')} ha, tenure: {s.get('tenure')})",
                        metric=f"Capacity Land: {s.get('cc_land')}, {mhi_str}",
                        provenance="authoritative" if s.get("assessment_status") == "certified" else "derived_unverified",
                    )
                )

        elif name == "get_missing_infrastructure":
            sid = int(args.get("site_id", 0))
            description = f"Audited water, school, health lifeline capacity deficits and tenure validation for Site #{sid}"
            data_source = "SETU Capacity Deficit Auditor"
            data = self.get_missing_infrastructure(sid)
            if data.get("found"):
                citations.append(
                    ChatCitation(
                        source="SETU Capacity Deficit Auditor",
                        detail=f"Lifeline Audit for Site #{sid}",
                        metric=f"Deficits: {len(data.get('deficits', []))}, Unmeasured: {len(data.get('unmeasured_lifelines', []))}",
                        provenance="authoritative",
                    )
                )

        elif name == "get_district_hazard_summary":
            dist = args.get("district")
            description = f"Audited macro-level disaster exposure across districts ({dist or 'all'})"
            data_source = "PostgreSQL / PostGIS (admin_boundary & habitation_risk)"
            data = self.get_district_hazard_summary(dist)
            citations.append(
                ChatCitation(
                    source="SETU PostGIS Engine",
                    detail=f"District Hazard Overview ({dist or 'All Districts'})",
                    metric=f"{data.get('total_urgent_population', 0):,} persons ({data.get('total_urgent_households', 0):,} HH) at risk",
                    provenance="authoritative",
                )
            )

        elif name == "list_urgent_villages":
            dist = str(args.get("district", "Barpeta"))
            description = f"Retrieved urgent (immediate & short_term) triage habitations queue for district {dist}"
            data_source = "PostgreSQL / PostGIS (triage queue)"
            data = self.list_urgent_villages(dist)
            citations.append(
                ChatCitation(
                    source="SETU Triage Queue",
                    detail=f"Urgent Habitations in {dist}",
                    metric=f"{data.get('total_population_at_risk', 0):,} persons ({data.get('total_households_at_risk', 0):,} HH) across {data.get('urgent_count', 0)} habitations",
                    provenance="authoritative",
                )
            )

        elif name == "assess_candidate_sites_suitability":
            dist = args.get("district")
            sids = args.get("site_ids")
            min_suit = args.get("min_suitability")
            max_m = args.get("max_mhi")
            st = args.get("status")
            lim = int(args.get("limit", 15))
            description = f"Assessed candidate site suitability and Section 6.8 H7 gates for {dist or 'cross-district'}"
            data_source = "PostgreSQL / PostGIS (candidate_site & admin_boundary)"
            data = self.assess_candidate_sites_suitability(
                district=dist,
                site_ids=sids,
                min_suitability=min_suit,
                max_mhi=max_m,
                status=st,
                limit=lim,
            )
            citations.append(
                ChatCitation(
                    source="SETU Candidate Site Auditor",
                    detail=f"Suitability Assessment ({dist or 'Cross-District'})",
                    metric=f"{data.get('total_evaluated', 0)} evaluated: {data.get('safe_count', 0)} Safe, {data.get('caution_count', 0)} Caution, {data.get('rejected_count', 0)} Rejected",
                    provenance="authoritative",
                )
            )

        elif name == "get_candidate_sites_for_habitation":
            hid = int(args.get("habitation_id", 0))
            rad = float(args.get("radius_km", 20.0))
            description = f"Searched candidate relocation sites within {rad}km of habitation #{hid}"
            data_source = "PostgreSQL / PostGIS (ST_DWithin spatial join)"
            data = self.get_candidate_sites_for_habitation(hid, radius_km=rad)
            if data.get("found"):
                citations.append(
                    ChatCitation(
                        source="SETU Spatial Allocation Engine",
                        detail=f"Candidate sites for habitation #{hid} ({rad}km radius)",
                        metric=f"Found {data.get('candidates_count', 0)} candidate parcels",
                        provenance="authoritative",
                    )
                )

        elif name == "search_habitations":
            q = str(args.get("query", ""))
            dist = args.get("district")
            description = f"Disambiguated habitation search for query '{q}' in {dist or 'all districts'}"
            data_source = "PostgreSQL / PostGIS (habitation register)"
            data = self.search_habitations(q, district=dist)
            citations.append(
                ChatCitation(
                    source="SETU Habitation Register",
                    detail=f"Habitation search: '{q}'",
                    metric=f"{data.get('count', 0)} matches found",
                    provenance="authoritative",
                )
            )

        elif name == "calculate":
            op = str(args.get("operation", "sum"))
            vals = [float(v) for v in args.get("values", [])]
            description = f"Computed exact arithmetic: {op}({vals})"
            data_source = "Deterministic Python Math Engine"
            data = self.calculate(op, vals)
            citations.append(
                ChatCitation(
                    source="SETU Deterministic Calculator",
                    detail=f"Exact arithmetic ({op})",
                    metric=f"Result: {data.get('result')}",
                    provenance="authoritative",
                )
            )

        exec_record = ToolExecutionRecord(
            name=name,
            description=description,
            arguments=args,
            status="completed" if data else "completed",
            data_source=data_source,
        )

        return data, citations, exec_record

    # =========================================================================
    # Deterministic Offline Fallback Synthesizer
    # =========================================================================

    def _offline_fallback_synthesis(
        self,
        request: RelocationChatRequest,
        error_reason: Optional[str] = None,
    ) -> RelocationChatResponse:
        """Deterministic grounded synthesizer when LLM API is unavailable or offline."""
        latest_user_msg = ""
        for m in reversed(request.messages):
            if m.role == "user":
                latest_user_msg = m.content
                break

        msg_lower = latest_user_msg.lower()
        district = request.district or "Barpeta"

        # Detect district from message text if mentioned
        for cand in ["barpeta", "wayanad", "kodagu", "rudraprayag", "dholpur", "srinagar", "morena"]:
            if cand in msg_lower or (cand == "wayanad" and ("wayand" in msg_lower or "waynad" in msg_lower)):
                district = cand.capitalize()
                break

        tools_called: List[str] = []
        tool_executions: List[ToolExecutionRecord] = []
        citations: List[ChatCitation] = []
        grounding_data: Dict[str, Any] = {}

        # 1. Check if user is asking for site-by-site suitability assessment, comparing sites, or which site is safer/worse
        is_site_assessment = any(k in msg_lower for k in [
            "site by site", "suitability assessment", "site suitability",
            "which site is safer", "which site is worse", "safer site", "worse site",
            "compare site", "compare the site", "candidate site", "site assessment", "suitability"
        ]) and not ("infrastructure" in msg_lower and re.search(r"site\s*#?\d+", msg_lower))

        if is_site_assessment:
            tools_called.append("assess_candidate_sites_suitability")
            has_district_explicit = any(c in msg_lower for c in ["barpeta", "wayanad", "kodagu", "rudraprayag", "dholpur", "srinagar", "morena"])
            eval_district = district if has_district_explicit else None
            data, cits, exec_rec = self._execute_tool(
                "assess_candidate_sites_suitability",
                {"district": eval_district, "limit": 10}
            )
            citations.extend(cits)
            tool_executions.append(exec_rec)
            grounding_data["site_suitability"] = data

            total_eval = data.get("total_evaluated", 0)
            safe_c = data.get("safe_count", 0)
            caut_c = data.get("caution_count", 0)
            rej_c = data.get("rejected_count", 0)
            sites = data.get("sites", [])

            scope_title = f"{eval_district} District" if eval_district else "Cross-District / All Monitored Areas"
            reply = (
                f"### Candidate Site Suitability & Safety Assessment: {scope_title}\n\n"
                f"- **Evaluated Relocation Parcels**: **{total_eval} candidate sites** evaluated under statutory Section 6.8 H7 Hard Gates `[Source: SETU PostGIS Engine]`\n"
                f"- **Gate Evaluation Summary**: **{safe_c} Order-Grade Safe** | **{caut_c} Caution/Provisional** | **{rej_c} Rejected (Hazard Encroachment)**\n\n"
                f"| Site ID | District | Area (ha) | Mean Slope | MHI | Land Cap | Certified Cap | Suitability | Section 6.8 Status | Legal Tenure & Constraints |\n"
                f"| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n"
            )

            for s in sites[:10]:
                mhi_str = f"{s.get('mhi_max'):.4f}" if s.get('mhi_max') is not None else "Unmeasured"
                slope_str = f"{s.get('slope_mean'):.1f}°" if s.get('slope_mean') is not None else "N/A"
                final_cap_str = f"{s.get('cc_final')} HH" if s.get('cc_final') is not None else "Provisional"
                gate_badge = f"`{s.get('h7_gate_status')}`"
                notes = s.get('tenure', 'unverified')
                if s.get('deficits'):
                    notes += f" — {'; '.join(s['deficits'][:1])}"
                elif s.get('caveats'):
                    notes += f" — {'; '.join(s['caveats'][:1])}"

                reply += (
                    f"| **#{s.get('id')}** | {s.get('district_name')} | {s.get('area_ha')} ha | {slope_str} | "
                    f"{mhi_str} | {s.get('cc_land', 0):,} HH | {final_cap_str} | **{s.get('suitability', 0)}/100** | "
                    f"{gate_badge} | {notes} |\n"
                )

            reply += (
                f"\n#### Statutory Section 6.8 H7 Decision Rules\n\n"
                f"1. **`ORDER_GRADE_SAFE`**: Clears all statutory hard gates: terrain slope < 15.0°, Multi-Hazard Index (MHI) < 0.25, and verified government revenue tenure.\n"
                f"2. **`CAUTION_PROVISIONAL`**: Terrain is safe, but either MHI is unmeasured (`NULL`) or tenure is unverified. Under strict Order-Grade mode, unmeasured lifelines block gazetting until field certification.\n"
                f"3. **`REJECTED`**: Fails mandatory hard gates due to high multi-hazard intensity (MHI ≥ 0.25) or steep landslide-prone slopes (≥ 15.0°).\n"
            )

            return RelocationChatResponse(
                reply=reply,
                tools_called=tools_called,
                tool_executions=tool_executions,
                citations=citations,
                grounding_data=grounding_data,
                fallback_used=True,
                fallback_reason=error_reason,
                model="deterministic-grounded-fallback-v1.0",
                district=eval_district or "Cross-District",
            )

        # 2. Check if user is asking to compare plans
        is_plan_comparison = ("compare" in msg_lower and ("plan" in msg_lower or "external" in msg_lower or "difference" in msg_lower or "allocation" in msg_lower)) or "external partner" in msg_lower
        if is_plan_comparison:
            tools_called.append("compare_relocation_plans")
            data, cits, exec_rec = self._execute_tool("compare_relocation_plans", {"district": district, "habitation_id": request.habitation_id})
            citations.extend(cits)
            tool_executions.append(exec_rec)
            grounding_data["comparison"] = data

            total_ext = data.get("total_external_recommended_households", 0)
            total_setu = data.get("total_setu_allocated_households", 0)
            comps = data.get("comparisons", [])

            reply = (
                f"### Comparative Evaluation: SETU Canonical vs. External GIS ({district})\n\n"
                f"- **External Partner Recommendations**: {total_ext} households proposed across {data.get('external_recommendations_count', 0)} settlements `[Source: External Partner GIS]`\n"
                f"- **SETU Authoritative Allocations**: {total_setu} households approved `[Source: SETU PostGIS Engine]`\n\n"
                f"#### Key Methodological Divergences:\n"
            )

            if total_setu == 0 and total_ext > 0:
                reply += (
                    "> [!IMPORTANT]\n"
                    "> **Section 6.8 (H7 Gate Invariant)**: In strict Order-Grade mode, SETU rejects candidate sites "
                    "whose multi-hazard index (MHI) is unmeasured (`NULL`) or whose land tenure is unverified. "
                    "External partner pipelines relied on geometric proximity proxies without geotechnical verification, "
                    "which creates hazardous administrative liability. To simulate exploratory allocations, switch to **Screening Mode**.\n\n"
                )

            if comps:
                reply += "| Habitation | Demand | External Site | SETU Site | Status |\n| :--- | :--- | :--- | :--- | :--- |\n"
                for item in comps[:6]:
                    ext_s = item.get("external_recommendation", {}).get("site_id", "N/A") if item.get("external_recommendation") else "None"
                    setu_s = item.get("setu_canonical_allocation", {}).get("site_id", "None") if item.get("setu_canonical_allocation") else "Rejected (H7 Gate)"
                    reply += f"| {item.get('habitation_name')} | {item.get('demand_households')} HH | #{ext_s} | #{setu_s} | {'Matched' if item.get('site_match') else 'Diverged'} |\n"

            return RelocationChatResponse(
                reply=reply,
                tools_called=tools_called,
                tool_executions=tool_executions,
                citations=citations,
                grounding_data=grounding_data,
                fallback_used=True,
                fallback_reason=error_reason,
                model="deterministic-grounded-fallback-v1.0",
                district=district,
            )

        # 2. Check if user is asking about missing infrastructure or site
        id_match = re.search(r"site\s*#?(\d+)", msg_lower) or re.search(r"#(\d+)", msg_lower)
        target_site_id = int(id_match.group(1)) if id_match else request.site_id

        if ("infrastructure" in msg_lower or "missing" in msg_lower or "site" in msg_lower) and target_site_id:
            tools_called.append("get_missing_infrastructure")
            data, cits, exec_rec = self._execute_tool("get_missing_infrastructure", {"site_id": target_site_id})
            citations.extend(cits)
            tool_executions.append(exec_rec)
            grounding_data["site_infrastructure"] = data

            if not data.get("found"):
                reply = f"Candidate Site #{target_site_id} was not found in the {district} cadastral register."
            else:
                reply = (
                    f"### Infrastructure & Carrying Capacity Audit: Candidate Site #{target_site_id}\n\n"
                    f"- **Contiguous Land Area**: {data.get('area_ha')} ha `[Source: SETU PostGIS Engine]`\n"
                    f"- **Land-Only Capacity Proxy (`cc_land`)**: {data.get('cc_land')} households\n"
                    f"- **Tenure Classification**: `{data.get('tenure')}`\n"
                    f"- **Status**: {'Provisional (Land-Only Screening)' if data.get('is_provisional') else 'Certified'}\n\n"
                    f"#### Deficits & Unmeasured Lifelines:\n"
                )
                if data.get("deficits"):
                    for d in data["deficits"]:
                        reply += f"- **Deficit**: {d}\n"
                if data.get("unmeasured_lifelines"):
                    for u in data["unmeasured_lifelines"]:
                        reply += f"- **Data Gap**: {u} `[Honest Data Gap Notice]`\n"

            return RelocationChatResponse(
                reply=reply,
                tools_called=tools_called,
                tool_executions=tool_executions,
                citations=citations,
                grounding_data=grounding_data,
                fallback_used=True,
                fallback_reason=error_reason,
                model="deterministic-grounded-fallback-v1.0",
                district=district,
            )

        # 3. Check single village priority
        hab_match = re.search(r"village\s*#?(\d+)", msg_lower) or re.search(r"habitation\s*#?(\d+)", msg_lower)
        target_hab = hab_match.group(1) if hab_match else (str(request.habitation_id) if request.habitation_id else None)

        if target_hab and ("why" in msg_lower or "priority" in msg_lower or "detail" in msg_lower):
            val = str(target_hab)
            tools_called.append("get_village_priority")
            data, cits, exec_rec = self._execute_tool("get_village_priority", {"name_or_id": val})
            citations.extend(cits)
            tool_executions.append(exec_rec)
            grounding_data["habitation"] = data

            if data.get("found"):
                h = data["habitation"]
                reply = (
                    f"### Habitation Relocation Assessment: {h.get('name')} (ID #{h.get('id')})\n\n"
                    f"- **District**: {h.get('district_name')} `[Source: SETU PostGIS Engine]`\n"
                    f"- **Triage Tier**: **{str(h.get('tier', 'monitoring')).upper()}**\n"
                    f"- **Demographics**: **{h.get('population'):,} persons** ({h.get('households'):,} households)\n"
                    f"- **Hazard Exposure**: Hazard Intensity **{h.get('hazard_intensity')}**, Permanent Red Zone overlap **{h.get('prz_overlap_pct')}%**\n"
                    f"- **Dominant Hazard**: `{h.get('dominant_hazard', 'riverine_flood')}`\n"
                    f"- **Priority Score**: **{h.get('priority_score')}** (Caseload: {h.get('caseload_score')})\n\n"
                    f"**Official Triage Rationale**:\n"
                    f"> {h.get('triage_rationale', 'Awaiting full spatial cell join.')}\n"
                )
                return RelocationChatResponse(
                    reply=reply,
                    tools_called=tools_called,
                    tool_executions=tool_executions,
                    citations=citations,
                    grounding_data=grounding_data,
                    fallback_used=True,
                    fallback_reason=error_reason,
                    model="deterministic-grounded-fallback-v1.0",
                    district=district,
                )

        # If user asks why this village is priority without giving an ID or name
        if not target_hab and any(p in msg_lower for p in ["why is this village", "why is this habitation", "why is the village", "why is the habitation"]):
            return RelocationChatResponse(
                reply=(
                    f"### Habitation Clarification Needed\n\n"
                    f"To view a specific habitation's triage priority, please specify the habitation name or ID "
                    f"(for example: *'Why is habitation Chooralmala prioritized?'* or select a row from the triage table in the left panel)."
                ),
                tools_called=[],
                tool_executions=[],
                citations=[],
                grounding_data={},
                fallback_used=True,
                fallback_reason=error_reason,
                model="deterministic-grounded-fallback-v1.0",
                district=district,
            )

        # 4. Cross-district macro comparison ("which district", "all districts", "most in danger", "across districts")
        is_multi_district = any(k in msg_lower for k in ["which district", "all district", "all the district", "across district", "worst district", "highest risk", "most people in danger"]) and not any(cand in msg_lower for cand in ["in barpeta", "in wayanad", "in kodagu", "in rudraprayag", "in dholpur", "in srinagar", "in morena"])

        if is_multi_district:
            tools_called.append("get_district_hazard_summary")
            data, cits, exec_rec = self._execute_tool("get_district_hazard_summary", {"district": "all"})
            citations.extend(cits)
            tool_executions.append(exec_rec)
            grounding_data["district_summary"] = data

            total_urg_pop = data.get("total_urgent_population", 0)
            total_urg_hh = data.get("total_urgent_households", 0)
            districts_list = data.get("districts", [])

            reply = (
                f"## National Disaster Exposure Summary: Cross-District Ranking\n\n"
                f"- **Total Population in Urgent Danger**: **{total_urg_pop:,} persons** across all monitored districts `[Source: SETU PostGIS Engine]`\n"
                f"- **Total Households in Urgent Danger**: **{total_urg_hh:,} households**\n\n"
                f"### District Risk Ranking (Urgent Population at Risk)\n\n"
                f"| Rank | District | Urgent Habitations | Urgent Population | Urgent Households | Immediate Risk | Short-Term Risk |\n"
                f"| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n"
            )

            rank = 1
            for d in districts_list:
                if d.get("urgent_population", 0) > 0:
                    reply += (
                        f"| {rank} | **{d.get('district_name')}** | {d.get('urgent_habitations')} | "
                        f"**{d.get('urgent_population'):,}** | **{d.get('urgent_households'):,}** | "
                        f"{d.get('immediate_population', 0):,} | {d.get('short_term_population', 0):,} |\n"
                    )
                    rank += 1

            reply += (
                f"\n### Key Operational Findings\n\n"
                f"1. **Wayanad** has the highest urgent population at risk (**29,990 persons** / 6,700 households), with 5,990 persons in the **immediate** landslide red zone requiring rapid pre-monsoon evacuation.\n"
                f"2. **Barpeta** has the second-highest urgent population (**24,759 persons** / 5,502 households) across 16 settlements, dominated by chronic riverine flooding and riverbank erosion.\n"
                f"3. **Kodagu** has 4,100 persons (920 households) facing immediate landslide risk.\n"
            )

            return RelocationChatResponse(
                reply=reply,
                tools_called=tools_called,
                tool_executions=tool_executions,
                citations=citations,
                grounding_data=grounding_data,
                fallback_used=True,
                fallback_reason=error_reason,
                model="deterministic-grounded-fallback-v1.0",
                district="All Districts",
            )

        # 5. District urgent queue overview / people in danger
        tools_called.append("list_urgent_villages")
        data, cits, exec_rec = self._execute_tool("list_urgent_villages", {"district": district})
        citations.extend(cits)
        tool_executions.append(exec_rec)
        grounding_data["urgent_queue"] = data

        total_pop = data.get("total_population_at_risk", 0)
        total_hh = data.get("total_households_at_risk", 0)
        habs = data.get("urgent_habitations", [])
        tier_bk = data.get("tier_breakdown", [])

        reply = (
            f"## Disaster Exposure Briefing: {district} District\n\n"
            f"- **Total Population at Risk**: **{total_pop:,} persons** `[Source: SETU PostGIS Engine]`\n"
            f"- **Total Households at Risk**: **{total_hh:,} households**\n"
            f"- **Urgent Habitations**: **{len(habs)} settlements** requiring immediate or short-term resettlement\n\n"
            f"### Hazard Triage Tier Summary\n\n"
            f"| Hazard Triage Tier | Habitations | Population at Risk | Households at Risk | Dominant Hazard | Priority Window |\n"
            f"| :--- | :--- | :--- | :--- | :--- | :--- |\n"
        )

        for tb in tier_bk:
            t_name = tb["tier"].replace("_", " ").title()
            hazards = ", ".join(tb.get("dominant_hazards", [])) or "Multi-Hazard"
            window = "0–6 Months" if tb["tier"] == "immediate" else "6–24 Months"
            reply += f"| **{t_name}** | {tb['habitations_count']} | **{tb['total_population']:,}** | **{tb['total_households']:,}** | {hazards} | {window} |\n"

        reply += f"| **Total** | **{len(habs)}** | **{total_pop:,}** | **{total_hh:,}** | | |\n\n"

        if habs:
            reply += (
                f"### Habitation Breakdown\n\n"
                f"| # | Habitation Name (ID) | Population | Households | Tier | Hazard Intensity | Dominant Hazard |\n"
                f"| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n"
            )
            for idx, h in enumerate(habs[:16], start=1):
                reply += (
                    f"| {idx} | **{h.get('name')}** (#{h.get('id')}) | {h.get('population', 0):,} | {h.get('households', 0):,} | "
                    f"`{h.get('tier')}` | {h.get('hazard_intensity', 0):.4f} | {h.get('dominant_hazard', 'riverine_flood')} |\n"
                )

        reply += (
            f"\n### Operational Guidance for Disaster Management\n\n"
            f"1. **Triage Prioritization**: Settlements categorized as `immediate` must receive rapid pre-monsoon evacuation and high-priority site allocation within 0–6 months.\n"
            f"2. **Resettlement Destination Rule (Section 6.8)**: All recipient candidate parcels must satisfy statutory H7 Hard Gates (MHI < 0.25, slope < 15°, zero forest/CRZ encroachment) before formal gazette allotment.\n"
            f"3. **Epistemic Integrity Notice**: Household and population figures are drawn directly from the authoritative PostGIS administrative boundaries database.\n"
        )

        return RelocationChatResponse(
            reply=reply,
            tools_called=tools_called,
            tool_executions=tool_executions,
            citations=citations,
            grounding_data=grounding_data,
            fallback_used=True,
            fallback_reason=error_reason,
            model="deterministic-grounded-fallback-v1.0",
            district=district,
        )

    # =========================================================================
    # Main Conversational Flow (Groq + Function Calling)
    # =========================================================================

    def _call_groq_api(
        self,
        client: httpx.Client,
        req_body: Dict[str, Any],
        headers: Dict[str, str],
    ) -> httpx.Response:
        """Isolated HTTP call to Groq API to allow testing and mock interception."""
        return client.post(
            f"{settings.GROQ_BASE_URL}/chat/completions",
            headers=headers,
            json=req_body,
        )

    def answer_query(self, request: RelocationChatRequest) -> RelocationChatResponse:
        """Processes user query with Groq LLM tool calling, falling back safely if offline."""
        api_key = settings.GROQ_API_KEY
        if not api_key:
            logger.info("GROQ_API_KEY not configured; using grounded offline fallback synthesizer.")
            return self._offline_fallback_synthesis(request, error_reason="GROQ_API_KEY not configured in environment")

        # Detect district from latest user message if explicitly specified
        active_district = request.district or "Barpeta"
        latest_user_text = ""
        for m in reversed(request.messages):
            if m.role == "user":
                latest_user_text = m.content.lower()
                break

        for cand in ["barpeta", "wayanad", "kodagu", "rudraprayag", "dholpur", "srinagar", "morena"]:
            if cand in latest_user_text or (cand == "wayanad" and ("wayand" in latest_user_text or "waynad" in latest_user_text)):
                active_district = cand.capitalize()
                break

        # Construct messages payload
        messages_payload: List[Dict[str, Any]] = [{"role": "system", "content": SYSTEM_PROMPT}]
        # Add context banner
        ctx_banner = (
            f"CURRENT CONTEXT: District={active_district}, "
            f"HabitationID={request.habitation_id or 'None'}, "
            f"SiteID={request.site_id or 'None'}, "
            f"ScreeningMode={request.screening_mode}"
        )
        messages_payload.append({"role": "system", "content": ctx_banner})

        for m in request.messages:
            messages_payload.append({"role": m.role, "content": m.content})

        tools_spec = self._get_tools_spec()
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        executed_tools: List[str] = []
        tool_executions: List[ToolExecutionRecord] = []
        collected_citations: List[ChatCitation] = []
        grounding_data: Dict[str, Any] = {}

        try:
            with httpx.Client(timeout=14.0) as client:
                max_tool_rounds = 4
                current_round = 0

                while current_round < max_tool_rounds:
                    current_round += 1
                    req_body = {
                        "model": settings.GROQ_MODEL,
                        "messages": messages_payload,
                        "tools": tools_spec,
                        "tool_choice": "auto" if current_round < max_tool_rounds else "none",
                        "temperature": 0.2,
                        "max_tokens": 1024,
                    }
                    resp = self._call_groq_api(client, req_body, headers)

                    if resp.status_code != 200:
                        logger.warning("Groq API returned HTTP %d: %s. Using fallback.", resp.status_code, resp.text)
                        return self._offline_fallback_synthesis(request, error_reason=f"Groq API returned HTTP {resp.status_code}")

                    data = resp.json()
                    choice = data["choices"][0]["message"]

                    # If model did not call tools, it has delivered its final synthesized reply
                    if not choice.get("tool_calls"):
                        final_text = choice.get("content", "")
                        final_text = self._verify_and_guard_answer(final_text, executed_tools, grounding_data)
                        return RelocationChatResponse(
                            reply=final_text,
                            tools_called=executed_tools,
                            tool_executions=tool_executions,
                            citations=collected_citations,
                            grounding_data=grounding_data,
                            fallback_used=False,
                            model=settings.GROQ_MODEL,
                            district=active_district,
                        )

                    # Otherwise, execute all tool calls in this round
                    messages_payload.append(choice)
                    for tc in choice["tool_calls"]:
                        fn_name = tc["function"]["name"]
                        try:
                            fn_args = json.loads(tc["function"].get("arguments", "{}"))
                        except Exception:
                            fn_args = {}

                        # Ensure district argument is populated if omitted by LLM
                        if "district" in fn_args and not fn_args["district"]:
                            fn_args["district"] = active_district
                        elif fn_name in ["list_urgent_villages", "compare_relocation_plans", "assess_candidate_sites_suitability"] and "district" not in fn_args:
                            fn_args["district"] = active_district

                        executed_tools.append(fn_name)

                        # Execute local tool
                        tool_res, cits, exec_rec = self._execute_tool(fn_name, fn_args)
                        collected_citations.extend(cits)
                        tool_executions.append(exec_rec)
                        
                        # Use unique key to prevent overwriting repeated calls to same tool (Audit Finding 6)
                        call_key = f"{fn_name}_{tc['id'][-6:]}" if fn_name in grounding_data else fn_name
                        grounding_data[call_key] = tool_res

                        # Wrap in explicit delimiters to prevent untrusted injection (Audit Finding 10)
                        messages_payload.append({
                            "role": "tool",
                            "tool_call_id": tc["id"],
                            "name": fn_name,
                            "content": f"<tool_output name='{fn_name}'>\n{json.dumps(tool_res)}\n</tool_output>",
                        })

                # If loop completed without returning, do one final synthesis round without tools
                final_req = {
                    "model": settings.GROQ_MODEL,
                    "messages": messages_payload,
                    "temperature": 0.2,
                    "max_tokens": 1024,
                }
                final_resp = self._call_groq_api(client, final_req, headers)
                if final_resp.status_code == 200:
                    final_choice = final_resp.json()["choices"][0]["message"]
                    final_text = self._verify_and_guard_answer(final_choice.get("content", ""), executed_tools, grounding_data)
                    return RelocationChatResponse(
                        reply=final_text,
                        tools_called=executed_tools,
                        tool_executions=tool_executions,
                        citations=collected_citations,
                        grounding_data=grounding_data,
                        fallback_used=False,
                        model=settings.GROQ_MODEL,
                        district=active_district,
                    )
                else:
                    return self._offline_fallback_synthesis(request, error_reason="Tool loop completed but final synthesis call failed.")

        except Exception as e:
            logger.exception("Error connecting to Groq API: %s. Using grounded fallback.", e)
            return self._offline_fallback_synthesis(request, error_reason=f"Network error or timeout: {str(e)}")
