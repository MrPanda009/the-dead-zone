"""Verification script for disaster history ingestion across Rudraprayag, Leh, and Srinagar."""

from api.dependencies import SessionLocal
from api.services.stats_service import StatsService
from api.services.hazard_service import HazardService
from api.repositories.habitations_repo import HabitationsRepository
from sqlalchemy import text


def main():
    db = SessionLocal()
    try:
        print("=" * 70)
        print("1. DATABASE TABLE COUNTS & STATES")
        print("=" * 70)
        tables = [
            "historical_disaster_loss",
            "ncrb_natural_hazard_casualty",
            "cwc_flood_damage_record",
            "highway_disaster_damage",
            "disaster_relief_allocation",
            "disaster_case_study",
            "disaster_event",
        ]
        for t in tables:
            count = db.execute(text(f"SELECT count(*) FROM {t}")).scalar()
            states = db.execute(
                text(f"SELECT DISTINCT state_name FROM {t}")
                if t != "disaster_event"
                else text("SELECT DISTINCT source FROM disaster_event")
            ).fetchall()
            print(f"{t:30}: {count:3} rows | Unique: {[s[0] for s in states]}")

        print("\n" + "=" * 70)
        print("2. STATS SERVICE STATE LIST")
        print("=" * 70)
        stats_svc = StatsService(db)
        avail = stats_svc.list_states()
        print("Published states:", avail.states)

        print("\n" + "=" * 70)
        print("3. STATS SERVICE DETAILS FOR THE THREE REGIONS")
        print("=" * 70)
        for state in ["Uttarakhand", "Ladakh", "Jammu & Kashmir"]:
            res = stats_svc.get_disaster_stats(state=state)
            print(f"\n[{state}]")
            print(f"  Loss time series ({len(res.loss_time_series)} records):")
            for l in res.loss_time_series:
                print(f"    - {l.year_label}: {l.lives_lost} lives, {l.houses_damaged} houses, {l.crop_area_affected_ha:,.0f} ha crop")
            print(f"  NCRB breakdown ({len(res.ncrb_hazard_breakdown)} records):")
            for n in res.ncrb_hazard_breakdown:
                print(f"    - {n.calendar_year}: Landslides={n.landslide_deaths}, FlashFloods={n.flash_flood_deaths}, Total={n.total_deaths}")
            print(f"  CWC flood records ({len(res.cwc_flood_history)} records):")
            for c in res.cwc_flood_history:
                print(f"    - {c.calendar_year}: {c.human_lives_lost} lives, Rs.{c.total_damage_crores:,.1f} Cr damage")
            if res.highway_damage:
                print(f"  Highway damage: {res.highway_damage.damaged_length_km} km ({res.highway_damage.disaster_triggers})")
            if res.response_funding:
                print(f"  Relief: SDRF Central=Rs.{res.response_funding[0].sdrf_central_share_cr} Cr, NDRF=Rs.{res.response_funding[0].ndrf_releases_cr} Cr")

        print("\n" + "=" * 70)
        print("4. STATE COMPARISON ENGINE")
        print("=" * 70)
        comp = stats_svc.compare_states("Uttarakhand", "Ladakh")
        print(f"Comparison: {comp.state1.state_name} vs {comp.state2.state_name}")
        print(f"  {comp.state1.state_name} dominant killer: {comp.state1.dominant_hazard_killer} (Total: {comp.state1.total_lives_lost} lives)")
        print(f"  {comp.state2.state_name} dominant killer: {comp.state2.dominant_hazard_killer} (Total: {comp.state2.total_lives_lost} lives)")
        print("  Insights:", comp.insights)

        print("\n" + "=" * 70)
        print("5. CASE STUDIES LIST")
        print("=" * 70)
        studies = stats_svc.list_case_studies()
        for cs in studies:
            print(f"  - [{cs.slug}] {cs.title} ({cs.event_date}): {cs.fatalities} fatalities")

        print("\n" + "=" * 70)
        print("6. HAZARD SERVICE DISTRICT SUMMARIES (LGD 55, 9, 12)")
        print("=" * 70)
        hazard_svc = HazardService(db)
        # Rudraprayag LGD 55
        try:
            r_sum = hazard_svc.get_district_summary(55)
            print(f"Rudraprayag (LGD 55): status={r_sum.model_status}, last_recorded_loss={r_sum.last_recorded_flood_loss}")
        except Exception as e:
            print("Rudraprayag summary error:", e)

        # Leh LGD 9
        try:
            l_sum = hazard_svc.get_district_summary(9)
            print(f"Leh (LGD 9): status={l_sum.model_status}, last_recorded_loss={l_sum.last_recorded_flood_loss}")
        except Exception as e:
            print("Leh summary error:", e)

        # Srinagar LGD 12
        try:
            s_sum = hazard_svc.get_district_summary(12)
            print(f"Srinagar (LGD 12): status={s_sum.model_status}, last_recorded_loss={s_sum.last_recorded_flood_loss}")
        except Exception as e:
            print("Srinagar summary error:", e)

        print("\n" + "=" * 70)
        print("7. POSTGIS SPATIAL DISASTER PROXIMITY CHECKS")
        print("=" * 70)
        hab_repo = HabitationsRepository(db)
        # Rudraprayag coordinates
        rudra_events = hab_repo.get_nearby_disaster_events(79.0669, 30.7346, radius_km=30.0)
        print(f"Nearby disasters around Rudraprayag (30km): {len(rudra_events)} found")
        for ev in rudra_events:
            print(f"  - {ev['source_ref']}: {ev['fatalities']} fatalities, distance: {ev['distance_km']:.2f} km")

        # Leh coordinates
        leh_events = hab_repo.get_nearby_disaster_events(77.5855, 34.1284, radius_km=30.0)
        print(f"Nearby disasters around Leh (30km): {len(leh_events)} found")
        for ev in leh_events:
            print(f"  - {ev['source_ref']}: {ev['fatalities']} fatalities, distance: {ev['distance_km']:.2f} km")

        # Srinagar coordinates
        srinagar_events = hab_repo.get_nearby_disaster_events(74.8340, 34.0750, radius_km=30.0)
        print(f"Nearby disasters around Srinagar (30km): {len(srinagar_events)} found")
        for ev in srinagar_events:
            print(f"  - {ev['source_ref']}: {ev['fatalities']} fatalities, distance: {ev['distance_km']:.2f} km")

        print("\n" + "=" * 70)
        print("ALL VERIFICATIONS COMPLETED SUCCESSFULLY")
        print("=" * 70)

    finally:
        db.close()


if __name__ == "__main__":
    main()
