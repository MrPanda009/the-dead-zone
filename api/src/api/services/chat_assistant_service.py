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
)
from api.services.recommendations_service import RecommendationsService

logger = logging.getLogger("setu_api.chat_assistant")

SYSTEM_PROMPT = """You are the Senior Relocation Decision Analyst and Legal Resettlement Advisor for the SETU-DRR platform (Disaster Management Division / NDRF).
Your job is to provide clear, grounded, and legally defensible explanations of village triage priorities, candidate relocation site suitability, and side-by-side comparisons between SETU's canonical OR-Tools optimization engine and external partner GIS recommendations.

CORE OPERATIONAL RULES:
1. STRICT EPISTEMIC INTEGRITY (NEVER FAKE OR GUESS DATA):
   - You only state facts derived directly from the pipeline tools.
   - If a hazard index (MHI) is NULL or unmeasured, explicitly state: "The multi-hazard index for this site is currently unmeasured (honest data gap) — exploratory screening only; physical ground geotechnical/hydraulic verification is legally required prior to allotment."
   - If lifelines (water, school, health capacity) are unmeasured, explicitly state that carrying capacity is provisional (land-only proxy).
   - If land tenure is "tenure_unverified", state that cadastral revenue checks are mandatory.

2. CITE PROVENANCE EXPLICITLY:
   - Always reference the data source using markdown tags:
     * `[Source: SETU PostGIS Engine]` for triage scores, PRZ overlaps, and canonical assignments.
     * `[Source: External Partner GIS]` for external offline proposals.
     * `[Source: Statutory H7 Hard Gate]` for reasons a site was excluded.

3. METHODOLOGY DIVERGENCE (WHY PLANS DIFFER):
   - External partner GIS pipelines often rely on geometric screening and assume unverified parcels are safe.
   - SETU canonical engine strictly enforces Section 6.8 / H7 hard eligibility gates: static MHI < 0.25, slope < 15°, forest/CRZ exclusions, and min-cost flow graph optimization.
   - Clearly explain these differences so administrators understand why household numbers or site choices diverge.

4. FORMATTING:
   - Use clean Markdown with concise headings, bullet points, and metric callouts.
   - Keep answers professional, executive-ready, and easy for a District Magistrate to read.
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
            SELECT h.id, h.name, h.households, hr.tier, hr.hazard_intensity,
                   hr.priority_score, hr.caseload_score, hr.dominant_hazard
            FROM habitation h
            JOIN habitation_risk hr ON h.id = hr.habitation_id
            JOIN admin_boundary ab ON h.admin_id = ab.id
            WHERE LOWER(ab.name) = LOWER(:d) AND hr.tier IN ('immediate', 'short_term')
            ORDER BY hr.priority_score DESC, h.households DESC
            LIMIT 25;
        """)

        rows = self.db.execute(query_sql, {"d": district}).mappings().all()
        return {
            "district": district,
            "urgent_count": len(rows),
            "urgent_habitations": [dict(r) for r in rows],
        }

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
                    "description": "List all immediate and short-term triage habitations requiring relocation in a district.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "district": {
                                "type": "string",
                                "description": "District name (e.g. 'Barpeta').",
                            }
                        },
                        "required": ["district"],
                    },
                },
            },
        ]

    def _execute_tool(self, name: str, args: Dict[str, Any]) -> Tuple[Dict[str, Any], List[ChatCitation]]:
        citations: List[ChatCitation] = []
        data: Dict[str, Any] = {}

        if name == "get_village_priority":
            data = self.get_village_priority(str(args.get("name_or_id", "")))
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

        elif name == "list_urgent_villages":
            dist = str(args.get("district", "Barpeta"))
            data = self.list_urgent_villages(dist)
            citations.append(
                ChatCitation(
                    source="SETU Triage Queue",
                    detail=f"Urgent Habitations in {dist}",
                    metric=f"Count: {data.get('urgent_count', 0)} habitations",
                    provenance="authoritative",
                )
            )

        return data, citations

    # =========================================================================
    # Deterministic Offline Fallback Synthesizer
    # =========================================================================

    def _offline_fallback_synthesis(
        self,
        request: RelocationChatRequest,
    ) -> RelocationChatResponse:
        """Deterministic grounded synthesizer when LLM API is unavailable or offline."""
        latest_user_msg = ""
        for m in reversed(request.messages):
            if m.role == "user":
                latest_user_msg = m.content
                break

        msg_lower = latest_user_msg.lower()
        district = request.district or "Barpeta"
        tools_called: List[str] = []
        citations: List[ChatCitation] = []
        grounding_data: Dict[str, Any] = {}

        # 1. Check if user is asking to compare plans
        if "compare" in msg_lower or "external" in msg_lower or "difference" in msg_lower:
            tools_called.append("compare_relocation_plans")
            data, cits = self._execute_tool("compare_relocation_plans", {"district": district, "habitation_id": request.habitation_id})
            citations.extend(cits)
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
                citations=citations,
                grounding_data=grounding_data,
                fallback_used=True,
                model="deterministic-grounded-fallback-v1.0",
                district=district,
            )

        # 2. Check if user is asking about missing infrastructure or site
        id_match = re.search(r"site\s*#?(\d+)", msg_lower) or re.search(r"#(\d+)", msg_lower)
        target_site_id = int(id_match.group(1)) if id_match else request.site_id

        if ("infrastructure" in msg_lower or "missing" in msg_lower or "site" in msg_lower) and target_site_id:
            tools_called.append("get_missing_infrastructure")
            data, cits = self._execute_tool("get_missing_infrastructure", {"site_id": target_site_id})
            citations.extend(cits)
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
                citations=citations,
                grounding_data=grounding_data,
                fallback_used=True,
                model="deterministic-grounded-fallback-v1.0",
                district=district,
            )

        # 3. Default: Check village priority or district urgent summary
        hab_match = re.search(r"village\s*#?(\d+)", msg_lower) or re.search(r"habitation\s*#?(\d+)", msg_lower) or (str(request.habitation_id) if request.habitation_id else None)
        target_hab = hab_match.group(1) if hasattr(hab_match, "group") else hab_match

        if target_hab or "why" in msg_lower or "priority" in msg_lower:
            val = str(target_hab) if target_hab else "775"
            tools_called.append("get_village_priority")
            data, cits = self._execute_tool("get_village_priority", {"name_or_id": val})
            citations.extend(cits)
            grounding_data["habitation"] = data

            if data.get("found"):
                h = data["habitation"]
                reply = (
                    f"### Habitation Relocation Assessment: {h.get('name')} (ID #{h.get('id')})\n\n"
                    f"- **District**: {h.get('district_name')} `[Source: SETU PostGIS Engine]`\n"
                    f"- **Triage Tier**: **{str(h.get('tier', 'monitoring')).upper()}**\n"
                    f"- **Demographics**: {h.get('population')} residents ({h.get('households')} households)\n"
                    f"- **Flood Exposure**: Hazard Intensity **{h.get('hazard_intensity')}**, Permanent Red Zone overlap **{h.get('prz_overlap_pct')}%**\n"
                    f"- **Priority Score**: **{h.get('priority_score')}** (Caseload: {h.get('caseload_score')})\n\n"
                    f"**Official Triage Rationale**:\n"
                    f"> {h.get('triage_rationale', 'Awaiting full spatial cell join.')}\n"
                )
                return RelocationChatResponse(
                    reply=reply,
                    tools_called=tools_called,
                    citations=citations,
                    grounding_data=grounding_data,
                    fallback_used=True,
                    model="deterministic-grounded-fallback-v1.0",
                    district=district,
                )

        # 4. District urgent queue overview
        tools_called.append("list_urgent_villages")
        data, cits = self._execute_tool("list_urgent_villages", {"district": district})
        citations.extend(cits)
        grounding_data["urgent_queue"] = data

        reply = (
            f"### Relocation Overview for District {district}\n\n"
            f"The SETU decision engine currently tracks **{data.get('urgent_count', 0)} urgent habitations** "
            f"in immediate or short-term relocation status `[Source: SETU PostGIS Engine]`.\n\n"
            f"You can ask me to:\n"
            f"1. *'Compare SETU vs External recommendation for {district}'*\n"
            f"2. *'Why was village #775 prioritized for short_term relocation?'*\n"
            f"3. *'What infrastructure is missing at Candidate Site #1752?'*\n"
        )

        return RelocationChatResponse(
            reply=reply,
            tools_called=tools_called,
            citations=citations,
            grounding_data=grounding_data,
            fallback_used=True,
            model="deterministic-grounded-fallback-v1.0",
            district=district,
        )

    # =========================================================================
    # Main Conversational Flow (Groq + Function Calling)
    # =========================================================================

    def answer_query(self, request: RelocationChatRequest) -> RelocationChatResponse:
        """Processes user query with Groq LLM tool calling, falling back safely if offline."""
        api_key = settings.GROQ_API_KEY
        if not api_key:
            logger.info("GROQ_API_KEY not configured; using grounded offline fallback synthesizer.")
            return self._offline_fallback_synthesis(request)

        # Construct messages payload
        messages_payload: List[Dict[str, Any]] = [{"role": "system", "content": SYSTEM_PROMPT}]
        # Add context banner
        ctx_banner = (
            f"CURRENT CONTEXT: District={request.district or 'Barpeta'}, "
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
        collected_citations: List[ChatCitation] = []
        grounding_data: Dict[str, Any] = {}

        try:
            with httpx.Client(timeout=12.0) as client:
                # Step 1: Initial tool-calling round
                req_body = {
                    "model": settings.GROQ_MODEL,
                    "messages": messages_payload,
                    "tools": tools_spec,
                    "tool_choice": "auto",
                    "temperature": 0.2,
                    "max_tokens": 1024,
                }
                resp = client.post(
                    f"{settings.GROQ_BASE_URL}/chat/completions",
                    headers=headers,
                    json=req_body,
                )

                if resp.status_code != 200:
                    logger.warning("Groq API returned HTTP %d: %s. Using fallback.", resp.status_code, resp.text)
                    return self._offline_fallback_synthesis(request)

                data = resp.json()
                choice = data["choices"][0]["message"]

                # Step 2: Handle tool calls if requested
                if choice.get("tool_calls"):
                    messages_payload.append(choice)
                    for tc in choice["tool_calls"]:
                        fn_name = tc["function"]["name"]
                        fn_args = json.loads(tc["function"].get("arguments", "{}"))
                        executed_tools.append(fn_name)

                        # Execute local tool
                        tool_res, cits = self._execute_tool(fn_name, fn_args)
                        collected_citations.extend(cits)
                        grounding_data[fn_name] = tool_res

                        messages_payload.append({
                            "role": "tool",
                            "tool_call_id": tc["id"],
                            "name": fn_name,
                            "content": json.dumps(tool_res),
                        })

                    # Step 3: Get final grounded answer from LLM with tool outputs
                    second_req = {
                        "model": settings.GROQ_MODEL,
                        "messages": messages_payload,
                        "temperature": 0.2,
                        "max_tokens": 1024,
                    }
                    second_resp = client.post(
                        f"{settings.GROQ_BASE_URL}/chat/completions",
                        headers=headers,
                        json=second_req,
                    )

                    if second_resp.status_code == 200:
                        final_choice = second_resp.json()["choices"][0]["message"]
                        return RelocationChatResponse(
                            reply=final_choice.get("content", ""),
                            tools_called=executed_tools,
                            citations=collected_citations,
                            grounding_data=grounding_data,
                            fallback_used=False,
                            model=settings.GROQ_MODEL,
                            district=request.district,
                        )
                    else:
                        logger.warning("Second Groq call failed; using fallback.")
                        return self._offline_fallback_synthesis(request)

                else:
                    # Model answered directly without tool calls
                    return RelocationChatResponse(
                        reply=choice.get("content", ""),
                        tools_called=[],
                        citations=[],
                        grounding_data={},
                        fallback_used=False,
                        model=settings.GROQ_MODEL,
                        district=request.district,
                    )

        except Exception as e:
            logger.exception("Error connecting to Groq API: %s. Using grounded fallback.", e)
            return self._offline_fallback_synthesis(request)
