#!/usr/bin/env python3
"""
query_gov_apis.py

High-speed querying CLI for the 283,286 government APIs in data_gov_apis.db.
Supports FTS5 BM25 full-text search, pillar filtering for SETU-DRR,
and inspecting specific dataset UUIDs.

Usage:
    python scripts/query_gov_apis.py search "landslide OR flood" --limit 10
    python scripts/query_gov_apis.py pillar hazards --limit 15
    python scripts/query_gov_apis.py inspect <dataset_uuid>
    python scripts/query_gov_apis.py stats
"""

import argparse
import json
import sqlite3
import sys
from pathlib import Path

DB_PATH = Path("data/data_gov_apis.db")

PILLAR_QUERIES = {
    "hazards": 'landslide OR flood OR rainfall OR cyclone OR earthquake OR "water level" OR reservoir OR precipitation OR meteorological',
    "demographics": 'habitation OR village OR census OR "scheduled caste" OR "scheduled tribe" OR poverty OR bpl OR kutcha',
    "infrastructure": 'pmgsy OR "rural road" OR bridge OR hospital OR phc OR chc OR "health centre" OR substation OR electricity',
    "relocation": 'wasteland OR "land use" OR "revenue land" OR forest OR groundwater OR aquifer OR cgwb OR "soil type"',
    "relief": '"relief camp" OR shelter OR evacuation OR "disaster management" OR idrn OR "civil defence" OR ndrf OR sdrf',
}


def get_connection() -> sqlite3.Connection:
    if not DB_PATH.exists():
        print(f"[!] Database not found at {DB_PATH}.")
        print("    Run `python scripts/index_gov_apis.py` first to generate it.")
        sys.exit(1)
    con = sqlite3.connect(str(DB_PATH))
    con.row_factory = sqlite3.Row
    return con


def format_row(row: sqlite3.Row, verbose: bool = False) -> str:
    lines = []
    lines.append(f"📌 [{row['dataset_uuid']}] {row['title']}")
    lines.append(f"   Sector:     {row['sector']} | Open API: {row['open']} | Updated: {row['updated_date']}")
    lines.append(f"   Ministry:   {row['ministry_department']}")
    if verbose or len(row["description"]) < 200:
        lines.append(f"   Desc:       {row['description']}")
    else:
        lines.append(f"   Desc:       {row['description'][:200]}...")
    if row["data_fields"]:
        fields = row["data_fields"].replace(";", ", ")
        if len(fields) > 160:
            fields = fields[:160] + "..."
        lines.append(f"   Fields:     {fields}")
    lines.append(f"   URL:        https://data.gov.in/resource/{row['dataset_uuid']}")
    return "\n".join(lines)


def clean_fts_query(query: str) -> str:
    """Sanitizes user input query for SQLite FTS5 parser."""
    import re
    # If the user already used quotes or uppercase boolean operators, leave it or quote hyphenated words
    tokens = query.split()
    cleaned = []
    for t in tokens:
        if t in ("AND", "OR", "NOT", "*"):
            cleaned.append(t)
        elif t.startswith('"') and t.endswith('"'):
            cleaned.append(t)
        elif "-" in t or "/" in t or ":" in t:
            # Quote tokens that have hyphens/slashes
            sub = t.replace('"', '')
            cleaned.append(f'"{sub}"')
        else:
            cleaned.append(t)
    return " ".join(cleaned)


def cmd_search(args):
    con = get_connection()
    cur = con.cursor()

    query_str = clean_fts_query(args.query.strip())
    conditions = ["apis_fts MATCH ?"]
    params = [query_str]

    if args.open_only:
        conditions.append("apis.open = 'Yes'")
    if args.sector:
        conditions.append("apis.sector LIKE ?")
        params.append(f"%{args.sector}%")

    where_clause = " AND ".join(conditions)
    sql = f"""
    SELECT apis.*, bm25(apis_fts) as rank
    FROM apis
    JOIN apis_fts ON apis.id = apis_fts.rowid
    WHERE {where_clause}
    ORDER BY rank
    LIMIT ?;
    """
    params.append(args.limit)

    results = cur.execute(sql, params).fetchall()

    if args.json:
        print(json.dumps([dict(r) for r in results], indent=2))
        return

    print(f"\n🔍 Results for query: '{args.query}' (Showing top {len(results)})\n" + "-" * 70)
    for i, r in enumerate(results, 1):
        print(f"\n#{i}")
        print(format_row(r, verbose=args.verbose))
    print("\n" + "-" * 70)


def cmd_pillar(args):
    pillar = args.name.lower()
    if pillar not in PILLAR_QUERIES:
        print(f"[!] Invalid pillar '{pillar}'. Choices are: {', '.join(PILLAR_QUERIES.keys())}")
        sys.exit(1)

    args.query = PILLAR_QUERIES[pillar]
    cmd_search(args)


def cmd_inspect(args):
    con = get_connection()
    cur = con.cursor()
    row = cur.execute("SELECT * FROM apis WHERE dataset_uuid = ?", (args.uuid,)).fetchone()
    if not row:
        print(f"[!] No dataset found with UUID: {args.uuid}")
        sys.exit(1)

    if args.json:
        print(json.dumps(dict(row), indent=2))
        return

    print(f"\n=======================================================")
    print(f"Dataset Details: {row['title']}")
    print(f"=======================================================")
    for k in row.keys():
        if k != "id":
            print(f"  {k:22}: {row[k]}")
    print(f"  {'resource_url':22}: https://data.gov.in/resource/{row['dataset_uuid']}")
    print("=======================================================\n")


def cmd_stats(args):
    con = get_connection()
    cur = con.cursor()

    total = cur.execute("SELECT count(*) FROM apis").fetchone()[0]
    open_count = cur.execute("SELECT count(*) FROM apis WHERE open = 'Yes'").fetchone()[0]

    print("\n================ DATA.GOV.IN CATALOG STATS ================")
    print(f"Total Datasets Indexed: {total:,}")
    print(f"Open APIs (Ready):      {open_count:,} ({open_count/total*100:.1f}%)")

    print("\nTop 10 Sectors:")
    for row in cur.execute(
        "SELECT sector, count(*) as c FROM apis WHERE sector != '' GROUP BY sector ORDER BY c DESC LIMIT 10"
    ):
        print(f"  - {row['sector']:35}: {row['c']:,}")

    print("\nTop 10 Ministries:")
    for row in cur.execute(
        "SELECT ministry_department, count(*) as c FROM apis WHERE ministry_department != '' GROUP BY ministry_department ORDER BY c DESC LIMIT 10"
    ):
        print(f"  - {row['ministry_department'][:45]:45}: {row['c']:,}")
    print("===========================================================\n")


def main():
    parser = argparse.ArgumentParser(description="Query data.gov.in APIs database for SETU-DRR")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Search command
    p_search = subparsers.add_parser("search", help="Full-text BM25 search")
    p_search.add_argument("query", type=str, help="Search query (e.g. 'landslide OR flood')")
    p_search.add_argument("--limit", type=int, default=10, help="Max results to return")
    p_search.add_argument("--open-only", action="store_true", help="Filter for open APIs only")
    p_search.add_argument("--sector", type=str, help="Filter by sector")
    p_search.add_argument("--verbose", action="store_true", help="Show full description")
    p_search.add_argument("--json", action="store_true", help="Output results as JSON")

    # Pillar command
    p_pillar = subparsers.add_parser("pillar", help="Search by SETU-DRR pillar")
    p_pillar.add_argument(
        "name",
        type=str,
        choices=list(PILLAR_QUERIES.keys()),
        help="Pillar name (hazards, demographics, infrastructure, relocation, relief)",
    )
    p_pillar.add_argument("--limit", type=int, default=10, help="Max results to return")
    p_pillar.add_argument("--open-only", action="store_true", help="Filter for open APIs only")
    p_pillar.add_argument("--sector", type=str, help="Filter by sector")
    p_pillar.add_argument("--verbose", action="store_true", help="Show full description")
    p_pillar.add_argument("--json", action="store_true", help="Output results as JSON")

    # Inspect command
    p_inspect = subparsers.add_parser("inspect", help="Inspect a specific dataset by UUID")
    p_inspect.add_argument("uuid", type=str, help="Dataset UUID")
    p_inspect.add_argument("--json", action="store_true", help="Output as JSON")

    # Stats command
    subparsers.add_parser("stats", help="Show catalog summary statistics")

    args = parser.parse_args()
    if args.command == "search":
        cmd_search(args)
    elif args.command == "pillar":
        cmd_pillar(args)
    elif args.command == "inspect":
        cmd_inspect(args)
    elif args.command == "stats":
        cmd_stats(args)


if __name__ == "__main__":
    main()
