"""Service layer for historical disaster statistics and comparison endpoints."""

from typing import List, Optional
from sqlalchemy.orm import Session

from core.schemas.stats import (
    AvailableStatesResponse,
    CwcFloodDamageDTO,
    DisasterCaseStudyDTO,
    DisasterStatsResponse,
    HighwayDisasterDamageDTO,
    HistoricalLossDTO,
    NcrbHazardCasualtyDTO,
    ReliefAllocationDTO,
    StateDisasterComparisonDTO,
    StateLossSummary,
)
from api.repositories.stats_repo import StatsRepository


class StatsService:
    def __init__(self, db: Session) -> None:
        self.repo = StatsRepository(db)

    def list_states(self) -> AvailableStatesResponse:
        states = self.repo.get_available_states()
        return AvailableStatesResponse(
            states=states if states else ["Assam", "Rajasthan", "Madhya Pradesh", "Kerala", "Karnataka"],
            default_state="Assam",
        )

    def get_disaster_stats(
        self, state: Optional[str] = "Assam", from_year: int = 2014, to_year: int = 2024
    ) -> DisasterStatsResponse:
        target_state = state if state and state.lower() != "all" else "Assam"
        losses = self.repo.get_historical_losses(target_state, from_year, to_year)
        ncrb = self.repo.get_ncrb_casualties(target_state, max(2019, from_year), to_year)
        cwc = self.repo.get_cwc_flood_damages(target_state, from_year, to_year)
        hwy = self.repo.get_highway_damage(target_state)
        relief = self.repo.get_relief_allocations(target_state, from_year, to_year)

        return DisasterStatsResponse(
            state_name=target_state,
            period_start=from_year,
            period_end=to_year,
            loss_time_series=[HistoricalLossDTO(**r) for r in losses],
            ncrb_hazard_breakdown=[NcrbHazardCasualtyDTO(**r) for r in ncrb],
            cwc_flood_history=[CwcFloodDamageDTO(**r) for r in cwc],
            highway_damage=HighwayDisasterDamageDTO(**hwy) if hwy else None,
            response_funding=[ReliefAllocationDTO(**r) for r in relief],
        )

    def compare_states(self, state1: str, state2: str) -> StateDisasterComparisonDTO:
        s1 = self.repo.get_state_loss_summary(state1)
        s2 = self.repo.get_state_loss_summary(state2)

        insights = [
            f"{state1} primary natural hazard mortality driver: {s1['dominant_hazard_killer']}.",
            f"{state2} primary natural hazard mortality driver: {s2['dominant_hazard_killer']}.",
        ]
        if s1["total_lives_lost"] > s2["total_lives_lost"]:
            diff = s1["total_lives_lost"] - s2["total_lives_lost"]
            insights.append(
                f"{state1} recorded {diff} more hydro-meteorological fatalities than {state2} across the monitored decade."
            )
        else:
            diff = s2["total_lives_lost"] - s1["total_lives_lost"]
            insights.append(
                f"{state2} recorded {diff} more hydro-meteorological fatalities than {state1} across the monitored decade."
            )

        return StateDisasterComparisonDTO(
            state1=StateLossSummary(**s1),
            state2=StateLossSummary(**s2),
            comparison_period="2014-2024 Historical Monsoons",
            insights=insights,
        )

    def list_case_studies(self, slug: Optional[str] = None) -> List[DisasterCaseStudyDTO]:
        rows = self.repo.get_case_studies(slug)
        return [DisasterCaseStudyDTO(**r) for r in rows]
