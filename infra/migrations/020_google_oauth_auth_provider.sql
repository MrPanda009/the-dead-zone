-- 020_google_oauth_auth_provider.sql
-- Migration 020: Enable Google OAuth 2.0 / OpenID Connect Federated Authentication
-- Allows password_hash to be NULL for OAuth users and adds Google Subject ID and avatar.

ALTER TABLE app_user ALTER COLUMN password_hash DROP NOT NULL;

ALTER TABLE app_user ADD COLUMN IF NOT EXISTS google_sub TEXT UNIQUE;
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'google';

CREATE INDEX IF NOT EXISTS idx_app_user_google_sub ON app_user(google_sub);
