import urllib.request
import urllib.error
import json
import psycopg
from core.config import settings

districts = [
    ("Wayanad", 178),
    ("Kodagu", 179),
    ("Dholpur", 180),
    ("Morena", 181),
    ("Barpeta", 191),
    ("Rudraprayag", 192),
    ("Srinagar", 193),
    ("Leh", 194),
]

conn = psycopg.connect(settings.DATABASE_URL)
cur = conn.cursor()

print("=" * 115)
print(f"{'District':<14} | {'Admin':<5} | {'Habitations':<11} | {'Sites':<6} | {'Solver Status':<16} | {'Assigned Pop':<14} | {'Details'}")
print("=" * 115)

for name, aid in districts:
    # Habitations count
    cur.execute("SELECT count(*) FROM habitation WHERE admin_id = %s", (aid,))
    hab_count = cur.fetchone()[0]

    # Sites count
    cur.execute("SELECT count(*) FROM candidate_site WHERE admin_id = %s", (aid,))
    site_count = cur.fetchone()[0]

    # Test solver
    payload = json.dumps({
        "admin_id": aid,
        "max_search_radius_km": 50.0,
        "target_tiers": ["urgent", "high", "moderate", "low"],
        "allow_group_splits": True,
        "distance_penalty_weight": 1.0,
        "screening_mode": True,
    }).encode("utf-8")

    req = urllib.request.Request(
        "http://localhost:8000/allocation/solve",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        resp = urllib.request.urlopen(req, timeout=10)
        res = json.loads(resp.read().decode())
        plan = res.get("plan") or res
        assigned = plan.get("total_assigned_population", 0)
        allocs = len(plan.get("allocations", []))
        status = "SOLVED"
        details = f"{allocs} allocations made ({assigned:,} people relocated)"
    except urllib.error.HTTPError as he:
        err_msg = he.read().decode("utf-8", errors="ignore")
        status = f"HTTP {he.code}"
        try:
            err_json = json.loads(err_msg)
            details = err_json.get("detail") or err_json.get("message") or err_msg
        except:
            details = err_msg
    except Exception as exc:
        status = "ERROR"
        details = str(exc)

    print(f"{name:<14} | {aid:<5} | {hab_count:<11} | {site_count:<6} | {status:<16} | {str(assigned if status == 'SOLVED' else '-'):<14} | {details}")

print("=" * 115)
