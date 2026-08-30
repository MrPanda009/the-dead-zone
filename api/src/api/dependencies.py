"""FastAPI dependencies for database sessions, pagination, and request context."""

from typing import Generator
from fastapi import Request
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from core.config import settings

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
