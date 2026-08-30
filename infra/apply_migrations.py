#!/usr/bin/env python3
"""Cross-platform migration runner for SETU-DRR using psycopg3."""

import sys
from pathlib import Path
import psycopg

from core.config import settings


def apply_migrations():
    repo_root = Path(__file__).resolve().parents[1]
    migrations_dir = repo_root / "infra" / "migrations"
    conninfo = settings.get_direct_psycopg_conninfo()

    print(f"Applying migrations from: {migrations_dir}")
    print(f"Connecting to database...")

    with psycopg.connect(conninfo, autocommit=True) as conn:
        with conn.cursor() as cur:
            # 1. Create schema_migrations tracker
            cur.execute("""
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    version TEXT PRIMARY KEY,
                    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
                );
            """)

            cur.execute("SELECT version FROM schema_migrations;")
            applied = {row[0] for row in cur.fetchall()}

            # 2. Find and apply *.sql files in order
            sql_files = sorted(migrations_dir.glob("*.sql"))
            if not sql_files:
                print("No migration files found.")
                return

            for sql_path in sql_files:
                version = sql_path.stem
                if version in applied:
                    print(f"  [SKIP]  {sql_path.name} (already applied)")
                    continue

                print(f"  [APPLY] {sql_path.name} ...", end=" ", flush=True)
                sql_content = sql_path.read_text(encoding="utf-8")

                with conn.transaction():
                    cur.execute(sql_content)
                    cur.execute(
                        "INSERT INTO schema_migrations (version) VALUES (%s);",
                        (version,)
                    )
                print("DONE")

    print("[SUCCESS] All migrations up to date.")


if __name__ == "__main__":
    try:
        apply_migrations()
    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}", file=sys.stderr)
        sys.exit(1)
