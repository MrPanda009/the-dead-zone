"""FastAPI main entrypoint for SETU-DRR serving layer (L5)."""

import logging
from contextlib import asynccontextmanager
from typing import Any
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.config import api_settings
from api.middleware import RequestIdAndLoggingMiddleware
from api.routes.health import router as health_router

logging.basicConfig(
    level=getattr(logging, api_settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("setu_api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    logger.info("Starting SETU-DRR API service...")
    logger.info(f"Database URL configured: {api_settings.DATABASE_URL.split('@')[-1] if '@' in api_settings.DATABASE_URL else 'localhost'}")
    logger.info(f"DEMO_MODE: {api_settings.DEMO_MODE}")
    yield
    logger.info("Shutting down SETU-DRR API service.")


app = FastAPI(
    title="SETU-DRR API",
    version=api_settings.MODEL_VERSION,
    description="Hazard Red Zone Identification, Carrying Capacity Assessment & Relocation Decision Support Platform.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# 1. CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=api_settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Request ID & Logging Middleware
app.add_middleware(RequestIdAndLoggingMiddleware)

# 3. Include Routers
app.include_router(health_router)


@app.get("/", tags=["General"])
def root_info() -> dict[str, Any]:
    """Root metadata endpoint."""
    return {
        "name": "SETU-DRR API",
        "description": "Hazard Red Zone & Relocation Decision Support Platform",
        "version": api_settings.MODEL_VERSION,
        "docs": "/docs",
        "health": "/health/live",
    }
