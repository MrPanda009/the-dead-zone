"""Health check endpoints (Day 0, PRD §37)."""

import logging
from typing import Any
from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from api.dependencies import get_db
from core.config import settings

logger = logging.getLogger("setu_api.health")
router = APIRouter(prefix="/health", tags=["Health"])


@router.get(
    "/live",
    summary="Process liveness check",
    status_code=status.HTTP_200_OK,
)
def check_liveness() -> dict[str, Any]:
    """Returns 200 OK if the FastAPI process is responsive."""
    return {
        "status": "ok",
        "service": "setu-drr-api",
        "version": settings.MODEL_VERSION,
        "demo_mode": settings.DEMO_MODE,
    }


@router.get(
    "/ready",
    summary="Application readiness check",
    status_code=status.HTTP_200_OK,
)
def check_readiness(db: Session = Depends(get_db)) -> JSONResponse:
    """Checks database connectivity, PostGIS & H3 extensions, and serving version."""
    checks: dict[str, Any] = {
        "database": False,
        "extensions": {"postgis": False, "h3": False, "h3_postgis": False},
        "serving_version": None,
    }

    try:
        # 1. Database basic connectivity
        db.execute(text("SELECT 1;"))
        checks["database"] = True

        # 2. Extensions check
        ext_res = db.execute(
            text("SELECT extname FROM pg_extension WHERE extname IN ('postgis', 'h3', 'h3_postgis');")
        ).fetchall()
        installed = {r[0] for r in ext_res}
        checks["extensions"]["postgis"] = "postgis" in installed
        checks["extensions"]["h3"] = "h3" in installed
        checks["extensions"]["h3_postgis"] = "h3_postgis" in installed

        # 3. Check serving version if table exists
        has_serving = db.execute(
            text("SELECT to_regclass('public.serving_version');")
        ).scalar()
        if has_serving:
            sv = db.execute(
                text("SELECT dataset_name, pipeline_run_id, updated_at FROM serving_version LIMIT 5;")
            ).fetchall()
            checks["serving_version"] = [
                {"dataset": r[0], "run_id": str(r[1]), "updated_at": str(r[2])} for r in sv
            ]

        is_ready = checks["database"] and checks["extensions"]["postgis"] and checks["extensions"]["h3"]
        status_code = status.HTTP_200_OK if is_ready else status.HTTP_503_SERVICE_UNAVAILABLE

        return JSONResponse(
            status_code=status_code,
            content={
                "status": "ready" if is_ready else "degraded",
                "checks": checks,
            },
        )

    except Exception as e:
        logger.error(f"Readiness check failed with database error: {e}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "not_ready",
                "error": str(e),
                "checks": checks,
            },
        )
