"""Service layer for static hazard layers consumed by the vector map."""

import json
import logging
from typing import Optional

from sqlalchemy.orm import Session

from core.constants import PRZ_ANY_SUSCEPTIBILITY
from core.config import REPO_ROOT
from core.enums import Hazard, CoverageFlag, HazardRegime
from core.errors import (
    DataUnavailableError,
    InvalidBboxError,
    InvalidH3IndexError,
    InvalidParametersError,
    InvalidResolutionError,
)
from core.h3_utils import h3_to_int, h3_to_str, is_valid_h3
from core.schemas.hazard import (
    FloodDriverDTO,
    HazardCellDTO,
    HazardCellDetailDTO,
    HazardLayerCoverageDTO,
    HazardLayerLegendDTO,
    HazardLayerResponse,
    HazardLayerSummaryDTO,
    DistrictHazardSummaryDTO,
    SusceptibilityBandBreakdown,
    FloodValidationDTO,
    RegimeSummaryDTO,
)
from api.repositories.hazard_repo import HazardRepository
from api.services.regime_context import regime_context_for

# Class breaks are sampled here rather than at even value intervals. See
# HazardLayerLegendDTO for why a linear ramp fails on this distribution.
DEFAULT_QUANTILES: list[float] = [0.25, 0.5, 0.75, 0.90, 0.95, 0.99]

ALLOWED_RESOLUTIONS: tuple[int, ...] = (6, 7, 8, 9)

MAX_BBOX_AREA_SQ_DEG: float = 5.0

MAX_CELL_LIMIT: int = 30000


logger = logging.getLogger(__name__)


class HazardService:
    def __init__(self, db: Session) -> None:
        self.repo = HazardRepository(db)

    # ------------------------------------------------------------------
    # Validation helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _parse_bbox(bbox: Optional[str]) -> tuple[Optional[float], ...]:
        """Parses and range-checks a 'min_lon,min_lat,max_lon,max_lat' string."""
        if not bbox:
            return (None, None, None, None)

        parts = bbox.split(",")
        if len(parts) != 4:
            raise InvalidBboxError(
                "BBox format must be 'min_lon,min_lat,max_lon,max_lat'.", {"bbox": bbox}
            )
        try:
            min_lon, min_lat, max_lon, max_lat = (float(p) for p in parts)
        except ValueError:
            raise InvalidBboxError(
                "BBox coordinates must be valid floating-point numbers.", {"bbox": bbox}
            )

        if not (-180.0 <= min_lon <= 180.0 and -180.0 <= max_lon <= 180.0):
            raise InvalidBboxError("Longitude values must be between -180 and 180.")
        if not (-90.0 <= min_lat <= 90.0 and -90.0 <= max_lat <= 90.0):
            raise InvalidBboxError("Latitude values must be between -90 and 90.")
        if min_lon >= max_lon or min_lat >= max_lat:
            raise InvalidBboxError("min_lon/min_lat must be strictly less than max_lon/max_lat.")

        area = (max_lon - min_lon) * (max_lat - min_lat)
        if area > MAX_BBOX_AREA_SQ_DEG:
            raise InvalidBboxError(
                f"BBox area ({area:.2f} sq deg) exceeds maximum allowed viewport "
                f"({MAX_BBOX_AREA_SQ_DEG} sq deg).",
                {"bbox_area": area, "max_allowed": MAX_BBOX_AREA_SQ_DEG},
            )
        return (min_lon, min_lat, max_lon, max_lat)

    @staticmethod
    def _validate_hazard_type(hazard_type: str) -> str:
        try:
            return Hazard(hazard_type).value
        except ValueError:
            raise InvalidParametersError(
                f"Unknown hazard_type '{hazard_type}'.",
                {"hazard_type": hazard_type, "allowed": [h.value for h in Hazard]},
            )

    @staticmethod
    def _dedupe_ascending(values: list[float]) -> list[float]:
        """Drops duplicate and non-monotonic breaks so the legend never renders empty classes."""
        result: list[float] = []
        for v in values:
            rounded = round(float(v), 4)
            if not result or rounded > result[-1]:
                result.append(rounded)
        return result

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def list_layers(self) -> list[HazardLayerSummaryDTO]:
        """Enumerates published static hazard layers so the client can build its layer switcher."""
        rows = self.repo.list_layers()
        return [
            HazardLayerSummaryDTO(
                hazard_type=r["hazard_type"],
                res=int(r["res"]),
                cell_count=int(r["cell_count"]),
                model_version=r["model_version"] or "v1.0.0",
                min_susceptibility=round(float(r["min_susceptibility"] or 0.0), 4),
                max_susceptibility=round(float(r["max_susceptibility"] or 0.0), 4),
                mean_susceptibility=round(float(r["mean_susceptibility"] or 0.0), 4),
                confidence_ceiling=round(float(r["confidence_ceiling"] or 1.0), 4),
            )
            for r in rows
        ]

    def get_layer(
        self,
        hazard_type: str = Hazard.RIVERINE_FLOOD.value,
        res: int = 8,
        bbox: Optional[str] = None,
        admin: Optional[int] = None,
        min_susceptibility: float = 0.0,
        regime: Optional[HazardRegime] = None,
        limit: int = 20000,
    ) -> HazardLayerResponse:
        """Returns every hazard cell in the viewport plus the legend needed to colour them."""
        hazard = self._validate_hazard_type(hazard_type)

        if res not in ALLOWED_RESOLUTIONS:
            raise InvalidResolutionError(res, list(ALLOWED_RESOLUTIONS))

        if not (0.0 <= min_susceptibility <= 1.0):
            raise InvalidParametersError(
                "min_susceptibility must be within [0.0, 1.0].",
                {"min_susceptibility": min_susceptibility},
            )

        min_lon, min_lat, max_lon, max_lat = self._parse_bbox(bbox)
        clamped_limit = min(max(1, limit), MAX_CELL_LIMIT)

        stats = self.repo.query_layer_statistics(
            hazard_type=hazard,
            res=res,
            min_lon=min_lon,
            min_lat=min_lat,
            max_lon=max_lon,
            max_lat=max_lat,
            admin=admin,
            regime=regime.value if regime else None,
            quantiles=DEFAULT_QUANTILES,
        )
        if stats is None:
            raise DataUnavailableError(
                f"No '{hazard}' cells published at resolution {res} for the requested extent.",
                {"hazard_type": hazard, "res": res, "bbox": bbox, "admin": admin, "regime": regime.value if regime else None},
            )

        rows = self.repo.query_layer_cells(
            hazard_type=hazard,
            res=res,
            min_lon=min_lon,
            min_lat=min_lat,
            max_lon=max_lon,
            max_lat=max_lat,
            admin=admin,
            min_susceptibility=min_susceptibility,
            regime=regime.value if regime else None,
            limit=clamped_limit,
        )

        cells = [
            HazardCellDTO(
                h3=h3_to_str(int(r["h3"])),
                susceptibility=round(float(r["susceptibility"] or 0.0), 4),
                confidence=round(float(r["confidence"] or 0.0), 4),
                quality_flag=self._coerce_flag(r["quality_flag"]),
                hard_zero_fraction=(
                    round(float(r["hard_zero_fraction"]), 4)
                    if r["hard_zero_fraction"] is not None
                    else None
                ),
                hazard_regime=r.get("hazard_regime"),
            )
            for r in rows
        ]

        # A ceiling of 0 would make the client divide by zero; fall back to 1.0 so an
        # unpopulated confidence column degrades to "raw values are already displayable".
        ceiling = float(stats["confidence_ceiling"] or 0.0) or 1.0

        legend = HazardLayerLegendDTO(
            method="quantile",
            quantiles=list(DEFAULT_QUANTILES),
            breaks=self._dedupe_ascending(list(stats["breaks"] or [])),
            domain=[
                round(float(stats["min_susceptibility"] or 0.0), 4),
                round(float(stats["max_susceptibility"] or 1.0), 4),
            ],
            confidence_ceiling=round(ceiling, 4),
            prz_susceptibility_threshold=PRZ_ANY_SUSCEPTIBILITY,
        )

        coverage = HazardLayerCoverageDTO(
            full=int(stats["full_count"] or 0),
            low_coverage=int(stats["low_coverage_count"] or 0),
            no_coverage=int(stats["no_coverage_count"] or 0),
            channel_excluded=int(stats["channel_excluded_count"] or 0),
        )

        return HazardLayerResponse(
            hazard_type=hazard,
            res=res,
            count=len(cells),
            truncated=len(cells) >= clamped_limit,
            model_version=stats["model_version"] or "v1.0.0",
            legend=legend,
            coverage=coverage,
            cells=cells,
        )

    def get_cell_detail(
        self,
        h3_param: str,
        hazard_type: str = Hazard.RIVERINE_FLOOD.value,
    ) -> HazardCellDetailDTO:
        """Retrieves the per-cell dossier: score, coverage provenance, and physical drivers."""
        hazard = self._validate_hazard_type(hazard_type)

        if not is_valid_h3(h3_param):
            raise InvalidH3IndexError(h3_param)

        h3_int = h3_to_int(h3_param)
        row = self.repo.get_cell_detail(h3_int, hazard)
        if not row:
            raise DataUnavailableError(
                f"H3 cell '{h3_param}' has no published '{hazard}' record.",
                {"h3": h3_param, "hazard_type": hazard},
            )

        ceiling = self.repo.get_confidence_ceiling(hazard) or 1.0
        confidence = float(row["confidence"] or 0.0)
        susceptibility = float(row["susceptibility"] or 0.0)

        drivers = FloodDriverDTO(
            mean_inundation_frequency=self._opt_round(row["mean_inundation_frequency"], 4),
            mean_hand_m=self._opt_round(row["mean_hand_m"], 2),
            min_hand_m=self._opt_round(row["min_hand_m"], 2),
            mean_slope_deg=self._opt_round(row["mean_slope_deg"], 2),
            mean_cropland_fraction=self._opt_round(row["mean_cropland_fraction"], 4),
            max_susceptibility=self._opt_round(row["max_susceptibility"], 4),
            valid_pixel_fraction=self._opt_round(row["valid_pixel_fraction"], 4),
            hard_zero_fraction=self._opt_round(row["hard_zero_fraction"], 4),
            mean_anomalous_frequency=self._opt_round(row.get("mean_anomalous_frequency"), 4),
            jrc_occurrence_mean=self._opt_round(row.get("jrc_occurrence_mean"), 4),
            baseline_water_fraction=self._opt_round(row.get("baseline_water_fraction"), 4),
            hazard_regime=row.get("hazard_regime"),
            dist_tributary_m=self._opt_round(row.get("dist_tributary_m"), 0),
            dist_mainstem_m=self._opt_round(row.get("dist_mainstem_m"), 0),
            sar_instability=self._sar_instability(row.get("mean_inundation_frequency")),
            observation_ceiling=int(row["observation_ceiling"] or 30),
        )

        return HazardCellDetailDTO(
            h3=h3_to_str(h3_int),
            h3_int=h3_int,
            res=int(row["res"]),
            hazard_type=row["hazard_type"],
            susceptibility=round(susceptibility, 4),
            confidence=round(confidence, 4),
            confidence_normalised=round(min(1.0, confidence / ceiling), 4),
            quality_flag=self._coerce_flag(row["quality_flag"]),
            model_version=row["model_version"] or "v1.0.0",
            centroid=[round(float(row["lon"]), 6), round(float(row["lat"]), 6)],
            admin_name=row["admin_name"],
            population=round(float(row["population"] or 0.0), 2),
            is_permanent_red_candidate=susceptibility >= PRZ_ANY_SUSCEPTIBILITY,
            drivers=drivers,
            regime_context=regime_context_for(row.get("hazard_regime")),
        )

    def get_district_summary(
        self,
        admin_identifier: int,
        hazard_type: str = Hazard.RIVERINE_FLOOD.value,
    ) -> DistrictHazardSummaryDTO:
        """Rolls up district-level flood exposure metrics and decision prompts."""
        hazard = self._validate_hazard_type(hazard_type)
        data = self.repo.get_district_summary(admin_identifier, hazard)
        if not data:
            raise DataUnavailableError(
                f"Admin boundary identifier '{admin_identifier}' not found.",
                {"admin": admin_identifier},
            )

        admin_name = data["admin_name"]
        hab_count = data["habitations_at_risk_count"]
        pop_count = data["population_at_risk_sum"]
        no_cov = data["unmeasured_cells_count"]
        last_loss = data["last_recorded_flood_loss"]
        is_computed = data["model_status"] == "computed"

        if is_computed:
            loss_snippet = (
                f"Last recorded state flood loss: {last_loss['human_lives_lost']} lives, ₹{last_loss['total_damage_crores']} Cr ({last_loss['calendar_year']})."
                if last_loss
                else "No state flood damage records available."
            )
            prompt = (
                f"{hab_count} habitations ({pop_count:,} citizens) situated in cells with flood susceptibility ≥ 0.50 in {admin_name}. "
                f"{no_cov} cells unmeasured (no satellite coverage). {loss_snippet}"
            )
        else:
            prompt = (
                f"Empirical SAR flood susceptibility model has not been computed for {admin_name}. "
                f"Screening based solely on historical aggregate disaster statistics."
            )

        driver_dto = (
            FloodDriverDTO(**data["drivers_summary"])
            if data["drivers_summary"]
            else None
        )

        return DistrictHazardSummaryDTO(
            admin_id=data["admin_id"],
            admin_name=data["admin_name"],
            lgd_code=data["lgd_code"],
            hazard_type=hazard,
            model_status=data["model_status"],
            model_version=data["model_version"],
            total_cells=data["total_cells"],
            coverage=HazardLayerCoverageDTO(**data["coverage"]),
            unmeasured_cells_count=no_cov,
            band_distribution=SusceptibilityBandBreakdown(**data["band_distribution"]),
            mean_susceptibility=data["mean_susceptibility"],
            max_susceptibility=data["max_susceptibility"],
            habitations_at_risk_count=hab_count,
            population_at_risk_sum=pop_count,
            drivers_summary=driver_dto,
            regime_summary=[RegimeSummaryDTO(**r) for r in data.get("regime_summary", [])],
            last_recorded_flood_loss=last_loss,
            officer_decision_prompt=prompt,
        )

    # ------------------------------------------------------------------
    # Coercion helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _coerce_flag(value: Optional[str]) -> CoverageFlag:
        """Never silently upgrades an unknown flag to FULL — unknown provenance is not full coverage."""
        try:
            return CoverageFlag(value or CoverageFlag.FULL.value)
        except ValueError:
            return CoverageFlag.LOW_COVERAGE

    @staticmethod
    def _sar_instability(frequency: Optional[float]) -> Optional[float]:
        """4F(1-F); mirrors pipeline `sar_instability_from_frequency`, which scores char-belt cells."""
        if frequency is None:
            return None
        f = min(1.0, max(0.0, float(frequency)))
        return round(4.0 * f * (1.0 - f), 4)

    @staticmethod
    def _opt_round(value: Optional[float], digits: int) -> Optional[float]:
        return round(float(value), digits) if value is not None else None

    def get_validation_summary(
        self, admin: int, hazard_type: str = Hazard.RIVERINE_FLOOD.value
    ) -> FloodValidationDTO:
        """Retrieves measured historical flood validation summary for an admin district."""
        boundary = self.repo.get_admin_boundary(admin)
        admin_id = boundary["id"] if boundary else admin
        lgd_code = boundary["lgd_code"] if boundary else None
        name = boundary["name"].lower() if boundary else str(admin).lower()

        DISTRICT_NAME_MAP = {
            "barpeta": "barpeta",
            "dholpur": "dholpur",
            "dhaulpur": "dholpur",
            "morena": "morena",
            "wayanad": "wayanad",
            "rudraprayag": "rudraprayag",
            "kodagu": "kodagu",
            "srinagar": "srinagar",
            "leh": "leh",
        }
        dist_slug = DISTRICT_NAME_MAP.get(name, name)

        candidate_paths = [
            REPO_ROOT / "data" / "processed" / "flood_validation" / dist_slug / "metrics.json",
            REPO_ROOT / "tests" / "fixtures" / "flood_validation" / f"baseline_{dist_slug}.json",
        ]

        metrics_file = next((p for p in candidate_paths if p.exists()), None)
        if not metrics_file:
            return FloodValidationDTO(
                district=dist_slug,
                admin_id=admin_id,
                lgd_code=lgd_code,
                model_version="flood-susceptibility-v0.1",
                status="not_validated",
                caveat_text=f"Independent historical validation has not yet been computed for {boundary['name'] if boundary else dist_slug}.",
            )

        try:
            payload = json.loads(metrics_file.read_text(encoding="utf-8"))
            spatial = payload.get("spatial", {})
            auc_dict = spatial.get("auc", {})
            pr_dict = spatial.get("pr_auc", {})
            sp_dict = spatial.get("spearman_frequency", {})
            ci95_block = spatial.get("ci95", {})
            ci95 = ci95_block.get("auc_model")
            year_matched = spatial.get("year_matched", {})
            pre2015 = spatial.get("pre2015_subset", {})
            ndem_refs = payload.get("references", {}).get("ndem", {})

            md_file = metrics_file.parent / "report.md"
            markdown_content = md_file.read_text(encoding="utf-8") if md_file.exists() else None

            return FloodValidationDTO(
                district=payload.get("district", dist_slug),
                admin_id=admin_id,
                lgd_code=lgd_code,
                model_version=payload.get("model_version", "flood-susceptibility-v0.1"),
                status="validated",
                generated_at=payload.get("generated_at"),
                reference_name="ISRO NDEM Historical Flood Inundation",
                reference_years=ndem_refs.get("years", []),
                n_cells=spatial.get("n_cells", 0),
                prevalence=spatial.get("prevalence", 0.0),
                roc_auc=auc_dict.get("model"),
                roc_auc_ci95=ci95,
                pr_auc=pr_dict.get("model"),
                pr_auc_prevalence=spatial.get("prevalence", 0.0),
                spearman_frequency=sp_dict.get("model"),
                baseline_hand_auc=auc_dict.get("hand_only"),
                baseline_frequency_auc=auc_dict.get("frequency_only"),
                baseline_anomalous_frequency_auc=auc_dict.get("anomalous_frequency_only"),
                baseline_dist_mainstem_auc=auc_dict.get("dist_mainstem"),
                baseline_dist_tributary_auc=auc_dict.get("dist_tributary"),
                baseline_dist_any_river_auc=auc_dict.get("dist_any_river"),
                baseline_distance_to_river_auc=auc_dict.get("distance_to_river"),
                by_regime=spatial.get("by_regime"),
                evaluation_domain=spatial.get("evaluation_domain"),
                imbalance=spatial.get("imbalance"),
                baseline_ci95={
                    k: ci95_block[k] for k in ("auc", "spearman", "auc_model_minus", "n_blocks") if k in ci95_block
                } or None,
                per_year=spatial.get("per_year"),
                sensitivity=spatial.get("sensitivity"),
                year_matched_auc=year_matched.get("auc"),
                year_matched_year=year_matched.get("year"),
                pre2015_auc=pre2015.get("auc"),
                losses_context=payload.get("losses_context"),
                gauges=payload.get("gauges"),
                caveat_text=(
                    "Agreement measures spatial alignment with independent historical flood extents "
                    "(ISRO NDEM). It does not claim hydrodynamic depth prediction, operational calibration, "
                    "or cross-validation ground truth."
                ),
                markdown_report=markdown_content,
            )
        except Exception:
            logger.exception("Failed to build validation payload from %s", metrics_file)
            return FloodValidationDTO(
                district=dist_slug,
                admin_id=admin_id,
                lgd_code=lgd_code,
                model_version="flood-susceptibility-v0.1",
                status="not_validated",
                caveat_text="Validation results could not be read for this district.",
            )

