"""FastAPI dependencies for database sessions, pagination, and request context."""

import uuid
from typing import Generator
from fastapi import Depends, Request
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from core.config import settings
from core.errors import PipelineNotReadyError

# Direct/Pooled database engine
# Using psycopg3 sync engine for stable Prepared Statement support with Neon & Martin
engine = create_engine(
    settings.get_sqlalchemy_url(direct=False),
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """Yields a database session and ensures clean closure."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_request_id(request: Request) -> str:
    """Retrieves request_id attached by RequestIdAndLoggingMiddleware."""
    return getattr(request.state, "request_id", "unknown")


# --------------------------------------------------------------------------- #
# H13: Serving-version readiness gate
# --------------------------------------------------------------------------- #
# Per H13 specification, only 'READY' is a valid servable status.
# If the referenced pipeline_run has status != 'READY', the API must refuse to serve data.
_SERVING_READY_STATUS = "READY"


def require_serving_version(db: Session = Depends(get_db)) -> uuid.UUID:
    """Enforces that a valid, ready serving version exists before serving data.

    The ``serving_version`` table has ``dataset_name`` as its PRIMARY KEY,
    so exactly one row per dataset name — no ambiguous ``LIMIT 1`` is needed.

    Raises:
        PipelineNotReadyError: HTTP 503 when no valid serving version exists
            or the linked pipeline run status != 'READY'.

    Returns:
        The ``pipeline_run_id`` of the active serving version.
    """
    row = db.execute(
        text(
            "SELECT sv.pipeline_run_id, pr.status "
            "FROM serving_version sv "
            "JOIN pipeline_run pr ON sv.pipeline_run_id = pr.id "
            "WHERE sv.dataset_name = 'default';"
        )
    ).mappings().first()

    if row is None or row["status"] != _SERVING_READY_STATUS:
        raise PipelineNotReadyError("default")

    return row["pipeline_run_id"]


# --------------------------------------------------------------------------- #
# Authentication & Identity Dependencies (Part 1)
# --------------------------------------------------------------------------- #

def get_current_user_optional(request: Request, db: Session = Depends(get_db)):
    """Resolves authenticated user from session cookie if present, returning None otherwise."""
    from api.services.auth_service import AuthService
    from core.errors import UnauthenticatedError

    token = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if not token:
        return None

    try:
        service = AuthService(db)
        return service.resolve_session(token)
    except UnauthenticatedError:
        return None


def require_authenticated(request: Request, db: Session = Depends(get_db)):
    """Enforces that a valid authenticated user session exists.
    
    Raises:
        UnauthenticatedError: HTTP 401 when session is missing, invalid, expired, revoked, or user inactive.
    """
    from api.services.auth_service import AuthService
    from core.errors import UnauthenticatedError

    token = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if not token:
        raise UnauthenticatedError("Authentication required. Please log in.")

    service = AuthService(db)
    return service.resolve_session(token)
