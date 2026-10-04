"""Audit script to inspect all live forecast and dynamic data in NeonDB."""

from sqlalchemy import create_engine, text
from core.config import settings

def main():
    url = settings.get_sqlalchemy_url()
    engine = create_engine(url)
    
    with engine.connect() as conn:
        print("=== NEON DB FORECAST DATA AUDIT ===")
        
        # 1. Check hazard_dynamic
        hd_total = conn.execute(text("SELECT count(*) FROM hazard_dynamic;")).scalar()
        hd_fcst = conn.execute(text("SELECT count(*) FROM hazard_dynamic WHERE forecast_cycle_at IS NOT NULL;")).scalar()
        hd_live = conn.execute(text("SELECT count(*) FROM hazard_dynamic WHERE forecast_cycle_at IS NULL;")).scalar()
        print(f"hazard_dynamic: total={hd_total}, forecast_cycle={hd_fcst}, observed/live={hd_live}")
        
        # Check hazard_dynamic sources
        hd_sources = conn.execute(text("SELECT source, count(*) FROM hazard_dynamic GROUP BY source;")).fetchall()
        for s in hd_sources:
            print(f"  source '{s[0]}': {s[1]} rows")
            
        # 2. Check mhi_snapshot
        mhi_total = conn.execute(text("SELECT count(*) FROM mhi_snapshot;")).scalar()
        mhi_fcst_not_null = conn.execute(text("SELECT count(*) FROM mhi_snapshot WHERE mhi_fcst IS NOT NULL;")).scalar()
        mhi_pure_fcst = conn.execute(text("""
            SELECT count(*) FROM mhi_snapshot 
            WHERE mhi_fcst IS NOT NULL 
              AND (mhi_live = 0.0 OR mhi_live IS NULL)
              AND zone_class NOT IN ('permanent_red', 'active_alert', 'caution');
        """)).scalar()
        print(f"mhi_snapshot: total={mhi_total}, mhi_fcst_not_null={mhi_fcst_not_null}, pure_fcst_snapshots={mhi_pure_fcst}")

        # 3. Check pipeline_run
        pr_runs = conn.execute(text("""
            SELECT run_type, status, count(*) 
            FROM pipeline_run 
            GROUP BY run_type, status;
        """)).fetchall()
        print("pipeline_run grouped by run_type and status:")
        for r in pr_runs:
            print(f"  run_type='{r[0]}', status='{r[1]}': {r[2]}")

        # 4. Check source_snapshot
        ss_sources = conn.execute(text("""
            SELECT source_id, count(*) 
            FROM source_snapshot 
            GROUP BY source_id;
        """)).fetchall()
        print("source_snapshot grouped by source_id:")
        for s in ss_sources:
            print(f"  source_id='{s[0]}': {s[1]}")

if __name__ == "__main__":
    main()
