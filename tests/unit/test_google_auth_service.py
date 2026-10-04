"""Unit and integration tests for Google OAuth 2.0 / OpenID Connect authentication.

Tests GoogleAuthService verification, RBAC provisioning, account linking,
deactivated user handling, session minting, and the POST /auth/google endpoint.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from api.dependencies import get_db, get_login_rate_limiter
from api.main import app
from api.services.google_auth_service import GoogleAuthService
from core.config import settings
from core.db_models import AppUser, UserSession
from core.domain.rate_limit import LoginRateLimiter
from core.enums import Role
from core.errors import UnauthenticatedError, ForbiddenError


@pytest.fixture
def in_memory_db():
    """Provides an isolated in-memory SQLite database for authentication testing."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    with engine.connect() as conn:
        conn.execute(
            text(
                "CREATE TABLE IF NOT EXISTS admin_boundary ("
                "id INTEGER PRIMARY KEY, name TEXT, level TEXT, lgd_code INTEGER, parent_id INTEGER);"
            )
        )
        conn.commit()

    AppUser.__table__.create(engine)
    UserSession.__table__.create(engine)

    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def fresh_rate_limiter():
    """Provides an in-memory rate limiter for testing."""
    return LoginRateLimiter(max_attempts=10, max_ip_attempts=20, window_seconds=60)


def create_mock_claims(
    email: str = "civilian@example.com",
    sub: str = "google-sub-12345",
    name: str = "Priya Sharma",
    picture: str = "https://lh3.googleusercontent.com/a/mock",
    email_verified: bool = True,
    iss: str = "accounts.google.com",
) -> dict[str, Any]:
    """Helper creating standard Google OIDC claims."""
    return {
        "iss": iss,
        "sub": sub,
        "email": email,
        "email_verified": email_verified,
        "name": name,
        "picture": picture,
        "aud": "mock-client-id",
        "exp": 9999999999,
    }


class TestGoogleAuthService:
    def test_new_user_provisioning_default_civilian(self, in_memory_db, fresh_rate_limiter):
        """New public email is auto-provisioned with CIVILIAN role."""
        claims = create_mock_claims(email="resident@gmail.com", sub="sub-resident-1")
        service = GoogleAuthService(
            in_memory_db,
            token_verifier=lambda token, aud: claims,
            rate_limiter=fresh_rate_limiter,
        )

        user, raw_token = service.authenticate_google_token("dummy.jwt.token")

        assert user.email == "resident@gmail.com"
        assert user.google_sub == "sub-resident-1"
        assert user.role == Role.CIVILIAN.value
        assert user.auth_provider == "google"
        assert user.avatar_url == "https://lh3.googleusercontent.com/a/mock"
        assert user.password_hash is None
        assert user.is_active is True
        assert raw_token is not None

        # Verify session was persisted
        session = service.repo.get_session_by_token_hash(
            from_token_hash := __import__("core.domain.auth", fromlist=["hash_session_token"]).hash_session_token(raw_token)
        )
        assert session is not None
        assert session.user_id == user.id

    def test_government_domain_auto_provisions_official(self, in_memory_db, fresh_rate_limiter):
        """Whitelisted government domain (@*.gov.in) auto-provisions as GOVERNMENT_OFFICIAL."""
        claims = create_mock_claims(email="officer.kerala@ndrf.gov.in", sub="sub-gov-999")
        service = GoogleAuthService(
            in_memory_db,
            token_verifier=lambda token, aud: claims,
            rate_limiter=fresh_rate_limiter,
        )

        user, _ = service.authenticate_google_token("dummy.jwt.token")

        assert user.email == "officer.kerala@ndrf.gov.in"
        assert user.role == Role.GOVERNMENT_OFFICIAL.value
        assert user.auth_provider == "google"

    def test_existing_account_linking(self, in_memory_db, fresh_rate_limiter):
        """If user already exists by verified email, links google_sub rather than duplicating."""
        # Pre-seed existing user (e.g. created previously)
        existing_user = AppUser(
            id=uuid.uuid4(),
            email="existing.officer@setu.gov.in",
            password_hash="$argon2id$...",
            full_name="Existing Officer",
            role=Role.GOVERNMENT_OFFICIAL.value,
            is_active=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        in_memory_db.add(existing_user)
        in_memory_db.commit()

        claims = create_mock_claims(
            email="existing.officer@setu.gov.in",
            sub="sub-linked-777",
            picture="https://google.com/pic.png",
        )
        service = GoogleAuthService(
            in_memory_db,
            token_verifier=lambda token, aud: claims,
            rate_limiter=fresh_rate_limiter,
        )

        user, _ = service.authenticate_google_token("dummy.jwt.token")

        assert user.id == existing_user.id
        assert user.google_sub == "sub-linked-777"
        assert user.avatar_url == "https://google.com/pic.png"
        assert user.role == Role.GOVERNMENT_OFFICIAL.value

    def test_unverified_email_rejected(self, in_memory_db, fresh_rate_limiter):
        """Rejects Google identity when email_verified is False (anti-account takeover)."""
        claims = create_mock_claims(email="unverified@gmail.com", email_verified=False)
        service = GoogleAuthService(
            in_memory_db,
            token_verifier=lambda token, aud: claims,
            rate_limiter=fresh_rate_limiter,
        )

        with pytest.raises(UnauthenticatedError, match="Google account email is not verified"):
            service.authenticate_google_token("dummy.jwt.token")

    def test_untrusted_issuer_rejected(self, in_memory_db, fresh_rate_limiter):
        """Rejects tokens from arbitrary untrusted issuers."""
        claims = create_mock_claims(iss="https://fake-google.attacker.com")
        service = GoogleAuthService(
            in_memory_db,
            token_verifier=lambda token, aud: claims,
            rate_limiter=fresh_rate_limiter,
        )

        with pytest.raises(UnauthenticatedError, match="Untrusted token issuer"):
            service.authenticate_google_token("dummy.jwt.token")

    def test_inactive_account_denied(self, in_memory_db, fresh_rate_limiter):
        """Deactivated users cannot authenticate via Google."""
        deactivated_user = AppUser(
            id=uuid.uuid4(),
            email="banned@example.org",
            google_sub="sub-banned-000",
            full_name="Banned User",
            role=Role.CIVILIAN.value,
            is_active=False,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        in_memory_db.add(deactivated_user)
        in_memory_db.commit()

        claims = create_mock_claims(email="banned@example.org", sub="sub-banned-000")
        service = GoogleAuthService(
            in_memory_db,
            token_verifier=lambda token, aud: claims,
            rate_limiter=fresh_rate_limiter,
        )

        with pytest.raises(ForbiddenError, match="Account is inactive"):
            service.authenticate_google_token("dummy.jwt.token")


class TestGoogleAuthApiIntegration:
    @pytest.fixture
    def client(self, in_memory_db):
        """Configured FastAPI TestClient with mocked Google verification."""
        def _override_get_db():
            yield in_memory_db

        app.dependency_overrides[get_db] = _override_get_db
        test_client = TestClient(app)
        yield test_client
        app.dependency_overrides.pop(get_db, None)

    def test_google_login_endpoint_lifecycle(self, client, monkeypatch):
        """Full endpoint test: POST /auth/google -> session cookie -> /auth/me -> /auth/logout -> 401."""
        mock_claims = create_mock_claims(
            email="district.collector@wayanad.gov.in",
            sub="google-sub-collector",
            name="District Collector Wayanad",
        )

        # Mock the default verifier function in google_auth_service
        monkeypatch.setattr(
            "api.services.google_auth_service.default_google_token_verifier",
            lambda raw_token, client_id: mock_claims,
        )

        # 1. Login with Google token
        res_login = client.post("/auth/google", json={"id_token": "valid.mock.id_token"})
        assert res_login.status_code == 200
        data = res_login.json()
        assert data["email"] == "district.collector@wayanad.gov.in"
        assert data["role"] == "GOVERNMENT_OFFICIAL"
        assert data["auth_provider"] == "google"
        assert data["access_token"] is not None
        assert settings.SESSION_COOKIE_NAME in res_login.cookies

        # 2. Access /auth/me using the session cookie
        res_me = client.get("/auth/me")
        assert res_me.status_code == 200
        assert res_me.json()["email"] == "district.collector@wayanad.gov.in"
        assert res_me.json()["role"] == "GOVERNMENT_OFFICIAL"

        # 3. Access /auth/me using Bearer header (cross-origin / non-cookie fallback)
        res_me_header = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {data['access_token']}"},
            cookies={},  # clear cookies to verify Bearer authorization path
        )
        assert res_me_header.status_code == 200
        assert res_me_header.json()["email"] == "district.collector@wayanad.gov.in"

        # 4. Logout
        res_logout = client.post("/auth/logout")
        assert res_logout.status_code == 200

        # 5. Subsequent /auth/me is rejected
        res_post_logout = client.get("/auth/me")
        assert res_post_logout.status_code == 401

    def test_google_login_endpoint_invalid_token_returns_401(self, client, monkeypatch):
        """Invalid Google token returns HTTP 401 UNAUTHENTICATED error envelope."""
        def _failing_verifier(raw_token, client_id):
            raise ValueError("Token signature verification failed")

        monkeypatch.setattr(
            "api.services.google_auth_service.default_google_token_verifier",
            _failing_verifier,
        )

        res = client.post("/auth/google", json={"id_token": "corrupted.jwt.token"})
        assert res.status_code == 401
        body = res.json()
        assert body["error"]["code"] == "UNAUTHENTICATED"
