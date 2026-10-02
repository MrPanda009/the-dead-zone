"""Inserts geo-located landmark disaster events for Rudraprayag, Leh, and Srinagar."""

from api.dependencies import SessionLocal
from sqlalchemy import text


def main():
    db = SessionLocal()
    try:
        existing_refs = {
            r[0] for r in db.execute(text("SELECT source_ref FROM disaster_event WHERE source_ref IS NOT NULL")).fetchall()
        }
        print("Existing disaster_event refs:", len(existing_refs))

        events_to_add = [
            {
                "ts": "2013-06-16",
                "hazard": "flash_flood",
                "lon": 79.0669,
                "lat": 30.7346,
                "fatalities": 5700,
                "injured": 4200,
                "houses": 3200,
                "sev": 1.0,
                "source": "USDMA / NIDM",
                "ref": "Kedarnath-Mandakini Debris Flow 2013",
            },
            {
                "ts": "2010-08-06",
                "hazard": "cloudburst",
                "lon": 77.5855,
                "lat": 34.1284,
                "fatalities": 255,
                "injured": 340,
                "houses": 1400,
                "sev": 1.0,
                "source": "LDMA / GSI",
                "ref": "Leh-Choglamsar Cloudburst Debris Flow 2010",
            },
            {
                "ts": "2014-09-07",
                "hazard": "riverine_flood",
                "lon": 74.8340,
                "lat": 34.0750,
                "fatalities": 284,
                "injured": 1450,
                "houses": 4200,
                "sev": 1.0,
                "source": "JKSDMA / CWC",
                "ref": "Srinagar Jhelum Embankment Breach 2014",
            },
        ]

        added = 0
        for ev in events_to_add:
            if ev["ref"] not in existing_refs:
                db.execute(
                    text("""
                    INSERT INTO disaster_event (ts, hazard_type, geom, fatalities, injured, houses_damaged, severity, source, source_ref)
                    VALUES (:ts, :hazard, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326), :fatalities, :injured, :houses, :sev, :source, :ref);
                """),
                    ev,
                )
                print(f"Inserted disaster_event: {ev['ref']}")
                added += 1

        db.commit()
        print(f"disaster_event table updated: {added} new events inserted.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
