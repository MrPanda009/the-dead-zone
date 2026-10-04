"""Google OAuth 2.0 / OpenID Connect Authentication Service for SETU-DRR.

Handles cryptographic ID token verification, safe user auto-provisioning,
account linking, RBAC role assignment, and server-side session issuance.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Optional
from sqlalchemy.orm import Session

from core.config import settings
from core.enums import Role
from core.errors import (
    UnauthenticatedError,
    ForbiddenError,
    RateLimitExceededError,
)
from core.db_models import AppUser
from core.domain.auth import (
    generate_session_token,
    hash_session_token,
)
from core.domain.rate_limit import LoginRateLimiter
from api.repositories.auth_repo import AuthRepository

logger = logging.getLogger("setu_google_auth_service")

# Google OIDC trusted issuers
_TRUSTED_ISSUERS = {"accounts.google.com", "https://accounts.google.com"}


def default_google_token_verifier(raw_id_token: str, client_id: str) -> dict[str, Any]:
    """Default production token verifier using Google's public JWKS certificates."""
    from google.oauth2 import id_token
    from google.auth.transport import requests as google_requests

    # Verify signature, audience, and exp claim with 10s clock skew tolerance
    return id_token.verify_oauth2_token(
        raw_id_token,
        google_requests.Request(),
        client_id or None,
        clock_skew_in_seconds=10,
    )


class GoogleAuthService:
    """Enterprise authentication service for Google Identity Services (GIS)."""

    def __init__(
        self,
        db: Session,
        token_verifier: Optional[Callable[[str, str], dict[str, Any]]] = None,
        rate_limiter: Optional[LoginRateLimiter] = None,
    ) -> None:
        self.db = db
        self.repo = AuthRepository(db)
        self.token_verifier = token_verifier or default_google_token_verifier

        if rate_limiter is None:
            from api.dependencies import get_login_rate_limiter
            self.rate_limiter = get_login_rate_limiter()
        else:
            self.rate_limiter = rate_limiter

    def authenticate_google_token(
        self,
        raw_id_token: str,
        client_ip: str = "127.0.0.1",
    ) -> tuple[AppUser, str]:
        """Verifies Google ID token and issues a secure server-side session.

        Returns:
            Tuple of (authenticated AppUser, raw_session_token).

        Raises:
            RateLimitExceededError: If rate limit is exceeded for client IP.
            UnauthenticatedError: If token signature/claims are invalid or email unverified.
            ForbiddenError: If account is deactivated.
        """
        # 1. Rate limiting check per client IP to prevent token verification flooding
        retry_after = self.rate_limiter.check_rate_limit("google_oauth", client_ip)
        if retry_after is not None:
            logger.warning(
                f"Rate limit exceeded for Google OAuth from IP '{client_ip}'. Retry after {retry_after}s"
            )
            raise RateLimitExceededError(
                message="Too many authentication attempts. Please try again later.",
                retry_after_seconds=retry_after,
            )

        # 2. Cryptographic token verification
        try:
            claims = self.token_verifier(raw_id_token, settings.GOOGLE_CLIENT_ID)
        except Exception as exc:
            self.rate_limiter.record_failed_attempt("google_oauth", client_ip)
            logger.warning(f"Google token verification failed from IP '{client_ip}': {exc}")
            raise UnauthenticatedError(f"Invalid Google ID token: {exc}") from exc

        # 3. Security validations
        issuer = claims.get("iss")
        if issuer not in _TRUSTED_ISSUERS:
            self.rate_limiter.record_failed_attempt("google_oauth", client_ip)
            logger.warning(f"Untrusted token issuer '{issuer}' from IP '{client_ip}'")
            raise UnauthenticatedError("Untrusted token issuer.")

        if not claims.get("email_verified", False):
            self.rate_limiter.record_failed_attempt("google_oauth", client_ip)
            logger.warning(f"Rejected unverified Google email '{claims.get('email')}'")
            raise UnauthenticatedError("Google account email is not verified.")

        email = claims.get("email", "").strip().lower()
        if not email:
            raise UnauthenticatedError("Google ID token missing valid email claim.")

        google_sub = str(claims.get("sub", "")).strip()
        if not google_sub:
            raise UnauthenticatedError("Google ID token missing valid subject identifier (sub).")

        full_name = claims.get("name") or email.split("@")[0]
        avatar_url = claims.get("picture")

        # 4. User Resolution & Provisioning
        user = self.repo.get_user_by_google_sub(google_sub)

        if user is None:
            # Check if user already exists by verified email (account linking)
            user = self.repo.get_user_by_email(email)
            if user is not None:
                logger.info(f"Linking existing account '{email}' (User {user.id}) to Google sub '{google_sub}'")
                user = self.repo.link_google_account(user.id, google_sub, avatar_url)
            else:
                # Determine role based on government domain whitelist
                domain = email.split("@")[-1]
                is_official = any(
                    domain == d or domain.endswith("." + d)
                    for d in settings.GOOGLE_OFFICIAL_DOMAINS
                )
                assigned_role = Role.GOVERNMENT_OFFICIAL.value if is_official else Role.CIVILIAN.value

                logger.info(
                    f"Auto-provisioning new user '{email}' via Google OAuth with role '{assigned_role}'"
                )
                user = self.repo.create_google_user(
                    email=email,
                    google_sub=google_sub,
                    full_name=full_name,
                    role=assigned_role,
                    avatar_url=avatar_url,
                    is_active=True,
                )

        # 5. Account status validation
        if not user.is_active:
            self.rate_limiter.record_failed_attempt("google_oauth", client_ip)
            logger.warning(f"Login denied for inactive user '{email}' (ID {user.id})")
            raise ForbiddenError("Account is inactive. Please contact an administrator.")

        # Clear rate limit on successful authentication
        self.rate_limiter.record_successful_login("google_oauth")

        # 6. Update last login timestamp
        now = datetime.now(timezone.utc)
        self.repo.update_last_login(user.id, now)

        # 7. Mint server-side session
        raw_token = generate_session_token()
        token_hash = hash_session_token(raw_token)
        expires_at = now + timedelta(days=settings.SESSION_DURATION_DAYS)

        self.repo.create_session(
            user_id=user.id,
            session_token_hash=token_hash,
            expires_at=expires_at,
        )

        logger.info(f"Authenticated Google user '{email}' (Role: {user.role}, Session created)")
        return user, raw_token
