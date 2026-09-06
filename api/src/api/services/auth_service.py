"""Authentication and session management service for SETU-DRR.

Section refs: SETU-DRR Auth Part 1 — Identity + Password Verification + Server-Side Sessions.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy.orm import Session

from core.config import settings
from core.enums import Role
from core.errors import UnauthenticatedError, InvalidParametersError
from core.db_models import AppUser, UserSession
from core.domain.auth import (
    hash_password,
    verify_password,
    generate_session_token,
    hash_session_token,
)
from api.repositories.auth_repo import AuthRepository

logger = logging.getLogger("setu_auth_service")

# Dummy hash used to equalize execution time when an email does not exist (prevents timing attacks)
_DUMMY_ARGON2_HASH = "$argon2id$v=19$m=65536,t=3,p=4$c2V0dWRycnBhc3N3b3Jkc2FsdA$kCj0v6X25v7c0Q0s5h9r4i2v1b8w7e6t3y0u9i8o7p6"


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = AuthRepository(db)

    def login(self, email: str, password: str) -> tuple[AppUser, str]:
        """Authenticates user with email and Argon2id password.
        
        Returns:
            Tuple of (authenticated AppUser, raw_session_token).
        
        Raises:
            UnauthenticatedError if credentials are invalid or user is inactive.
        """
        norm_email = email.strip().lower()
        user = self.repo.get_user_by_email(norm_email)

        if user is None:
            # Perform dummy verification to neutralize timing difference
            verify_password(password, _DUMMY_ARGON2_HASH)
            logger.warning(f"Failed login attempt: unknown email '{norm_email}'")
            raise UnauthenticatedError("Invalid email or password.")

        if not verify_password(password, user.password_hash):
            logger.warning(f"Failed login attempt: incorrect password for '{norm_email}'")
            raise UnauthenticatedError("Invalid email or password.")

        if not user.is_active:
            logger.warning(f"Failed login attempt: inactive account '{norm_email}'")
            raise UnauthenticatedError("Account is inactive. Please contact your administrator.")

        # Update last login timestamp
        now = datetime.now(timezone.utc)
        self.repo.update_last_login(user.id, now)

        # Generate secure raw session token & store its SHA-256 hash
        raw_token = generate_session_token()
        token_hash = hash_session_token(raw_token)
        expires_at = now + timedelta(days=settings.SESSION_DURATION_DAYS)

        self.repo.create_session(
            user_id=user.id,
            session_token_hash=token_hash,
            expires_at=expires_at,
        )

        logger.info(f"Successful login for user '{norm_email}' (Role: {user.role})")
        return user, raw_token

    def resolve_session(self, raw_token: str) -> AppUser:
        """Resolves an authenticated active user from a raw session token.
        
        Raises:
            UnauthenticatedError if token is invalid, expired, revoked, or user inactive.
        """
        if not raw_token:
            raise UnauthenticatedError("Authentication required. No session token provided.")

        token_hash = hash_session_token(raw_token)
        session = self.repo.get_session_by_token_hash(token_hash)

        if session is None:
            raise UnauthenticatedError("Invalid or nonexistent session.")

        if session.revoked_at is not None:
            raise UnauthenticatedError("Session has been revoked. Please log in again.")

        now = datetime.now(timezone.utc)
        expires_at = session.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if expires_at <= now:
            raise UnauthenticatedError("Session has expired. Please log in again.")

        user = session.user
        if user is None or not user.is_active:
            raise UnauthenticatedError("Associated user account is inactive or not found.")

        return user

    def logout(self, raw_token: Optional[str]) -> None:
        """Revokes the session associated with the provided raw token."""
        if not raw_token:
            return

        try:
            token_hash = hash_session_token(raw_token)
            session = self.repo.get_session_by_token_hash(token_hash)
            if session is not None and session.revoked_at is None:
                self.repo.revoke_session(session.id)
                logger.info(f"Session {session.id} revoked for user {session.user_id}")
        except Exception as e:
            logger.warning(f"Error during logout revocation: {e}")

    def register_civilian(self, email: str, password: str, full_name: str) -> AppUser:
        """Registers a new public user with role strictly enforced as CIVILIAN."""
        norm_email = email.strip().lower()
        existing = self.repo.get_user_by_email(norm_email)
        if existing is not None:
            raise InvalidParametersError("An account with this email address already exists.")

        hashed_pw = hash_password(password)
        user = self.repo.create_user(
            email=norm_email,
            password_hash=hashed_pw,
            full_name=full_name.strip(),
            role=Role.CIVILIAN.value,
            is_active=True,
        )
        logger.info(f"Registered new civilian user '{norm_email}'")
        return user
