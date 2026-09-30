#!/usr/bin/env python3
"""
index_gov_apis.py

Streams the large data.gov.in APIs CSV (467 MB, 283k+ rows) and indexes it into
a high-performance local SQLite database with an FTS5 full-text search index.

Usage:
    python scripts/index_gov_apis.py [path_to_csv] [path_to_db]
"""

import csv
import os
import sqlite3
import sys
import time
from pathlib import Path

# Increase field size limit to handle large description/schema columns
csv.field_size_limit(sys.maxsize)

DEFAULT_CSV_PATHS = [
    Path("../data_gov_in_apis.csv"),
    Path("/Users/shrey/Projects/aryan-SIH/data_gov_in_apis.csv"),
    Path("data/data_gov_in_apis.csv"),
]
DEFAULT_DB_PATH = Path("data/data_gov_apis.db")


def find_csv_path(user_path: str = None) -> Path:
    if user_path:
        p = Path(user_path)
        if p.exists():
            return p
        raise FileNotFoundError(f"Specified CSV file not found: {user_path}")
    for p in DEFAULT_CSV_PATHS:
        if p.exists():
            return p
    raise FileNotFoundError(
        f"Could not locate data_gov_in_apis.csv in default locations: {DEFAULT_CSV_PATHS}"
    )


def create_schema(con: sqlite3.Connection):
    cur = con.cursor()
    cur.execute("DROP TABLE IF EXISTS apis_fts;")
    cur.execute("DROP TABLE IF EXISTS apis;")

    # Main relational table
    cur.execute("""
    CREATE TABLE apis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dataset_uuid TEXT UNIQUE,
        title TEXT,
        description TEXT,
        open TEXT,
        ministry_department TEXT,
        organisation_type TEXT,
        sector TEXT,
        domain TEXT,
        visualizable TEXT,
        source TEXT,
        catalog_uuid TEXT,
        created_date TEXT,
        updated_date TEXT,
        data_fields TEXT
    );
    """)

    # FTS5 External Content Virtual Table for instant BM25 full-text queries
    cur.execute("""
    CREATE VIRTUAL TABLE apis_fts USING fts5(
        title,
        description,
        ministry_department,
        sector,
        data_fields,
        content='apis',
        content_rowid='id'
    );
    """)
    con.commit()


def index_csv(csv_path: Path, db_path: Path, batch_size: int = 10000):
    start_time = time.time()
    db_path.parent.mkdir(parents=True, exist_ok=True)

    print(f"[*] Source CSV: {csv_path.resolve()} ({csv_path.stat().st_size / (1024*1024):.1f} MB)")
    print(f"[*] Target DB:  {db_path.resolve()}")

    con = sqlite3.connect(str(db_path))
    # Turbo performance pragmas for bulk ingest
    con.execute("PRAGMA journal_mode = OFF;")
    con.execute("PRAGMA synchronous = 0;")
    con.execute("PRAGMA cache_size = 100000;")

    create_schema(con)

    insert_sql = """
    INSERT OR IGNORE INTO apis (
        title, description, open, ministry_department, organisation_type,
        sector, domain, visualizable, source, dataset_uuid,
        catalog_uuid, created_date, updated_date, data_fields
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """

    total_rows = 0
    batch = []

    print("[*] Ingesting CSV rows into SQLite...")
    with open(csv_path, mode="r", encoding="utf-8", errors="ignore") as f:
        reader = csv.reader(f)
        header = next(reader)  # Skip header

        for row in reader:
            if not row:
                continue
            # Ensure row length matches 14 columns
            if len(row) < 14:
                row = row + [""] * (14 - len(row))
            elif len(row) > 14:
                row = row[:14]

            batch.append(row)
            total_rows += 1

            if len(batch) >= batch_size:
                con.executemany(insert_sql, batch)
                con.commit()
                batch.clear()
                print(f"    -> Ingested {total_rows:,} rows...", end="\r", flush=True)

        if batch:
            con.executemany(insert_sql, batch)
            con.commit()
            batch.clear()

    print(f"\n[+] Completed inserting {total_rows:,} records into main table.")

    # Rebuild FTS5 index
    print("[*] Building FTS5 full-text index (BM25 tokenization)...")
    fts_start = time.time()
    con.execute("INSERT INTO apis_fts(apis_fts) VALUES('rebuild');")
    con.commit()
    print(f"[+] FTS5 index built in {time.time() - fts_start:.2f}s.")

    # Create secondary indexes for structured filters
    print("[*] Creating secondary indexes on metadata fields...")
    con.execute("CREATE INDEX IF NOT EXISTS idx_apis_open ON apis(open);")
    con.execute("CREATE INDEX IF NOT EXISTS idx_apis_sector ON apis(sector);")
    con.execute("CREATE INDEX IF NOT EXISTS idx_apis_updated ON apis(updated_date);")
    con.execute("CREATE INDEX IF NOT EXISTS idx_apis_uuid ON apis(dataset_uuid);")
    con.commit()

    # Re-enable normal safety pragmas
    con.execute("PRAGMA synchronous = NORMAL;")
    con.close()

    total_duration = time.time() - start_time
    db_size_mb = db_path.stat().st_size / (1024 * 1024)
    print(f"\n[✓] Indexing complete in {total_duration:.2f} seconds!")
    print(f"[✓] Database file: {db_path} ({db_size_mb:.1f} MB)")


if __name__ == "__main__":
    csv_file = find_csv_path(sys.argv[1] if len(sys.argv) > 1 else None)
    db_file = Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_DB_PATH
    index_csv(csv_file, db_file)
