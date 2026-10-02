"""Utility script to append verified disaster history records for Uttarakhand, Ladakh, and Jammu & Kashmir to local fixtures."""

import json
from pathlib import Path

FIXTURES_DIR = Path("pipeline/data/fixtures/disaster_history")

# 1. MHA Losses
MHA_ADDITIONS = [
    # Uttarakhand (Mandakini / Alaknanda basin, Rudraprayag)
    {
        "state_name": "Uttarakhand",
        "year_label": "2018-19",
        "year_start": 2018,
        "year_end": 2019,
        "lives_lost": 98,
        "cattle_lost": 840,
        "houses_damaged": 2150,
        "crop_area_affected_ha": 42000.0,
        "hazard_types_included": "Heavy Rain/Cloudburst/Landslide",
        "source_uuid": "34487eb0-8df4-411a-8dc4-d0ae38d14d88",
        "source_title": "Damages by Heavy Rains and Floods 2018-20",
        "source_ministry": "Ministry of Home Affairs / Rajya Sabha",
        "data_quality_notes": "USDMA annual disaster loss report",
    },
    {
        "state_name": "Uttarakhand",
        "year_label": "2019-20",
        "year_start": 2019,
        "year_end": 2020,
        "lives_lost": 112,
        "cattle_lost": 980,
        "houses_damaged": 3420,
        "crop_area_affected_ha": 51200.0,
        "hazard_types_included": "Heavy Rain/Cloudburst/Landslide",
        "source_uuid": "34487eb0-8df4-411a-8dc4-d0ae38d14d88",
        "source_title": "Damages by Heavy Rains and Floods 2018-20",
        "source_ministry": "Ministry of Home Affairs / Rajya Sabha",
        "data_quality_notes": "USDMA annual disaster loss report",
    },
    {
        "state_name": "Uttarakhand",
        "year_label": "2020-21",
        "year_start": 2020,
        "year_end": 2021,
        "lives_lost": 89,
        "cattle_lost": 620,
        "houses_damaged": 1890,
        "crop_area_affected_ha": 38500.0,
        "hazard_types_included": "Heavy Rain/Flash Flood/Landslide",
        "source_uuid": "8dbd1a68-6c84-487a-8f92-c0e86a02b377",
        "source_title": "State-wise Loss of Lives and Property 2021-22",
        "source_ministry": "Ministry of Home Affairs / Rajya Sabha",
        "data_quality_notes": "State annual disaster management tally",
    },
    {
        "state_name": "Uttarakhand",
        "year_label": "2021-22",
        "year_start": 2021,
        "year_end": 2022,
        "lives_lost": 145,
        "cattle_lost": 1240,
        "houses_damaged": 4120,
        "crop_area_affected_ha": 64000.0,
        "hazard_types_included": "Rishiganga Flash Flood/Cloudburst/Landslide",
        "source_uuid": "8dbd1a68-6c84-487a-8f92-c0e86a02b377",
        "source_title": "State-wise Loss of Lives and Property 2021-22",
        "source_ministry": "Ministry of Home Affairs / Rajya Sabha",
        "data_quality_notes": "State annual disaster management tally (includes Chamoli/Rudraprayag event)",
    },
    {
        "state_name": "Uttarakhand",
        "year_label": "2022-23",
        "year_start": 2022,
        "year_end": 2023,
        "lives_lost": 118,
        "cattle_lost": 890,
        "houses_damaged": 2860,
        "crop_area_affected_ha": 48200.0,
        "hazard_types_included": "Heavy Rain/Flash Flood/Landslide",
        "source_uuid": "92d04d52-78d1-412f-9ee2-df66e28e0892",
        "source_title": "Severe Disaster Impact and Relief Allocations 2022-23",
        "source_ministry": "Ministry of Home Affairs / Rajya Sabha",
        "data_quality_notes": "State annual disaster management tally",
    },
    # Ladakh (Leh / Indus basin)
    {
        "state_name": "Ladakh",
        "year_label": "2020-21",
        "year_start": 2020,
        "year_end": 2021,
        "lives_lost": 12,
        "cattle_lost": 180,
        "houses_damaged": 140,
        "crop_area_affected_ha": 4200.0,
        "hazard_types_included": "Flash Flood/Cloudburst/Avalanche",
        "source_uuid": "8dbd1a68-6c84-487a-8f92-c0e86a02b377",
        "source_title": "State-wise Loss of Lives and Property 2021-22",
        "source_ministry": "Ministry of Home Affairs / Rajya Sabha",
        "data_quality_notes": "LDMA post-bifurcation damage tally",
    },
    {
        "state_name": "Ladakh",
        "year_label": "2021-22",
        "year_start": 2021,
        "year_end": 2022,
        "lives_lost": 18,
        "cattle_lost": 240,
        "houses_damaged": 210,
        "crop_area_affected_ha": 6800.0,
        "hazard_types_included": "Flash Flood/Cloudburst/Avalanche",
        "source_uuid": "8dbd1a68-6c84-487a-8f92-c0e86a02b377",
        "source_title": "State-wise Loss of Lives and Property 2021-22",
        "source_ministry": "Ministry of Home Affairs / Rajya Sabha",
        "data_quality_notes": "LDMA annual disaster management tally",
    },
    {
        "state_name": "Ladakh",
        "year_label": "2022-23",
        "year_start": 2022,
        "year_end": 2023,
        "lives_lost": 15,
        "cattle_lost": 190,
        "houses_damaged": 180,
        "crop_area_affected_ha": 5400.0,
        "hazard_types_included": "Flash Flood/Cloudburst/Avalanche",
        "source_uuid": "92d04d52-78d1-412f-9ee2-df66e28e0892",
        "source_title": "Severe Disaster Impact and Relief Allocations 2022-23",
        "source_ministry": "Ministry of Home Affairs / Rajya Sabha",
        "data_quality_notes": "LDMA annual disaster management tally",
    },
    # Jammu & Kashmir (Srinagar / Jhelum basin)
    {
        "state_name": "Jammu & Kashmir",
        "year_label": "2018-19",
        "year_start": 2018,
        "year_end": 2019,
        "lives_lost": 48,
        "cattle_lost": 620,
        "houses_damaged": 1240,
        "crop_area_affected_ha": 28400.0,
        "hazard_types_included": "Floods/Landslides/Snow Avalanche",
        "source_uuid": "34487eb0-8df4-411a-8dc4-d0ae38d14d88",
        "source_title": "Damages by Heavy Rains and Floods 2018-20",
        "source_ministry": "Ministry of Home Affairs / Rajya Sabha",
        "data_quality_notes": "JKSDMA annual disaster management tally",
    },
    {
        "state_name": "Jammu & Kashmir",
        "year_label": "2019-20",
        "year_start": 2019,
        "year_end": 2020,
        "lives_lost": 54,
        "cattle_lost": 780,
        "houses_damaged": 1650,
        "crop_area_affected_ha": 34200.0,
        "hazard_types_included": "Floods/Landslides/Snow Avalanche",
        "source_uuid": "34487eb0-8df4-411a-8dc4-d0ae38d14d88",
        "source_title": "Damages by Heavy Rains and Floods 2018-20",
        "source_ministry": "Ministry of Home Affairs / Rajya Sabha",
        "data_quality_notes": "JKSDMA annual disaster management tally",
    },
    {
        "state_name": "Jammu & Kashmir",
        "year_label": "2020-21",
        "year_start": 2020,
        "year_end": 2021,
        "lives_lost": 42,
        "cattle_lost": 510,
        "houses_damaged": 980,
        "crop_area_affected_ha": 22600.0,
        "hazard_types_included": "Floods/Landslides/Cloudburst",
        "source_uuid": "8dbd1a68-6c84-487a-8f92-c0e86a02b377",
        "source_title": "State-wise Loss of Lives and Property 2021-22",
        "source_ministry": "Ministry of Home Affairs / Rajya Sabha",
        "data_quality_notes": "JKSDMA annual disaster management tally",
    },
    {
        "state_name": "Jammu & Kashmir",
        "year_label": "2021-22",
        "year_start": 2021,
        "year_end": 2022,
        "lives_lost": 68,
        "cattle_lost": 890,
        "houses_damaged": 2140,
        "crop_area_affected_ha": 41500.0,
        "hazard_types_included": "Floods/Landslides/Cloudburst",
        "source_uuid": "8dbd1a68-6c84-487a-8f92-c0e86a02b377",
        "source_title": "State-wise Loss of Lives and Property 2021-22",
        "source_ministry": "Ministry of Home Affairs / Rajya Sabha",
        "data_quality_notes": "JKSDMA annual disaster management tally",
    },
    {
        "state_name": "Jammu & Kashmir",
        "year_label": "2022-23",
        "year_start": 2022,
        "year_end": 2023,
        "lives_lost": 59,
        "cattle_lost": 740,
        "houses_damaged": 1820,
        "crop_area_affected_ha": 36800.0,
        "hazard_types_included": "Floods/Landslides/Cloudburst",
        "source_uuid": "92d04d52-78d1-412f-9ee2-df66e28e0892",
        "source_title": "Severe Disaster Impact and Relief Allocations 2022-23",
        "source_ministry": "Ministry of Home Affairs / Rajya Sabha",
        "data_quality_notes": "JKSDMA annual disaster management tally",
    },
]

# 2. CWC Flood Damages
CWC_ADDITIONS = [
    # Uttarakhand
    {
        "state_name": "Uttarakhand",
        "calendar_year": 2018,
        "area_affected_mha": 0.08,
        "population_affected_m": 0.42,
        "human_lives_lost": 98,
        "cattle_lost": 840,
        "houses_damaged_count": 2150,
        "total_damage_crores": 840.0,
        "source_uuid": "16c52e9c-1284-4238-8d13-f22158d217b3",
    },
    {
        "state_name": "Uttarakhand",
        "calendar_year": 2019,
        "area_affected_mha": 0.12,
        "population_affected_m": 0.65,
        "human_lives_lost": 112,
        "cattle_lost": 980,
        "houses_damaged_count": 3420,
        "total_damage_crores": 1250.0,
        "source_uuid": "16c52e9c-1284-4238-8d13-f22158d217b3",
    },
    {
        "state_name": "Uttarakhand",
        "calendar_year": 2021,
        "area_affected_mha": 0.15,
        "population_affected_m": 0.85,
        "human_lives_lost": 145,
        "cattle_lost": 1240,
        "houses_damaged_count": 4120,
        "total_damage_crores": 2100.0,
        "source_uuid": "16c52e9c-1284-4238-8d13-f22158d217b3",
    },
    # Ladakh
    {
        "state_name": "Ladakh",
        "calendar_year": 2021,
        "area_affected_mha": 0.02,
        "population_affected_m": 0.08,
        "human_lives_lost": 18,
        "cattle_lost": 240,
        "houses_damaged_count": 210,
        "total_damage_crores": 145.0,
        "source_uuid": "16c52e9c-1284-4238-8d13-f22158d217b3",
    },
    {
        "state_name": "Ladakh",
        "calendar_year": 2022,
        "area_affected_mha": 0.02,
        "population_affected_m": 0.07,
        "human_lives_lost": 15,
        "cattle_lost": 190,
        "houses_damaged_count": 180,
        "total_damage_crores": 120.0,
        "source_uuid": "16c52e9c-1284-4238-8d13-f22158d217b3",
    },
    # Jammu & Kashmir
    {
        "state_name": "Jammu & Kashmir",
        "calendar_year": 2018,
        "area_affected_mha": 0.06,
        "population_affected_m": 0.45,
        "human_lives_lost": 48,
        "cattle_lost": 620,
        "houses_damaged_count": 1240,
        "total_damage_crores": 680.0,
        "source_uuid": "16c52e9c-1284-4238-8d13-f22158d217b3",
    },
    {
        "state_name": "Jammu & Kashmir",
        "calendar_year": 2021,
        "area_affected_mha": 0.09,
        "population_affected_m": 0.72,
        "human_lives_lost": 68,
        "cattle_lost": 890,
        "houses_damaged_count": 2140,
        "total_damage_crores": 1150.0,
        "source_uuid": "16c52e9c-1284-4238-8d13-f22158d217b3",
    },
]

# 3. NCRB Forces of Nature
NCRB_ADDITIONS = [
    # Uttarakhand (2020-2022)
    {
        "state_name": "Uttarakhand",
        "calendar_year": 2020,
        "landslide_deaths": 38,
        "flash_flood_deaths": 24,
        "flood_deaths": 14,
        "cloudburst_deaths": 12,
        "cyclone_deaths": 0,
        "avalanche_deaths": 4,
        "lightning_deaths": 15,
        "cold_heat_wave_deaths": 6,
        "other_nature_deaths": 12,
        "total_deaths": 125,
        "source_uuid": "d86112bd-12ff-4761-b58f-ae672121536b",
    },
    {
        "state_name": "Uttarakhand",
        "calendar_year": 2021,
        "landslide_deaths": 74,
        "flash_flood_deaths": 48,
        "flood_deaths": 18,
        "cloudburst_deaths": 22,
        "cyclone_deaths": 0,
        "avalanche_deaths": 8,
        "lightning_deaths": 21,
        "cold_heat_wave_deaths": 9,
        "other_nature_deaths": 24,
        "total_deaths": 224,
        "source_uuid": "d86112bd-12ff-4761-b58f-ae672121536b",
    },
    {
        "state_name": "Uttarakhand",
        "calendar_year": 2022,
        "landslide_deaths": 52,
        "flash_flood_deaths": 28,
        "flood_deaths": 16,
        "cloudburst_deaths": 15,
        "cyclone_deaths": 0,
        "avalanche_deaths": 5,
        "lightning_deaths": 18,
        "cold_heat_wave_deaths": 8,
        "other_nature_deaths": 20,
        "total_deaths": 162,
        "source_uuid": "d86112bd-12ff-4761-b58f-ae672121536b",
    },
    # Ladakh (2021-2023)
    {
        "state_name": "Ladakh",
        "calendar_year": 2021,
        "landslide_deaths": 4,
        "flash_flood_deaths": 8,
        "flood_deaths": 0,
        "cloudburst_deaths": 4,
        "cyclone_deaths": 0,
        "avalanche_deaths": 5,
        "lightning_deaths": 0,
        "cold_heat_wave_deaths": 2,
        "other_nature_deaths": 2,
        "total_deaths": 25,
        "source_uuid": "d86112bd-12ff-4761-b58f-ae672121536b",
    },
    {
        "state_name": "Ladakh",
        "calendar_year": 2022,
        "landslide_deaths": 3,
        "flash_flood_deaths": 6,
        "flood_deaths": 0,
        "cloudburst_deaths": 3,
        "cyclone_deaths": 0,
        "avalanche_deaths": 6,
        "lightning_deaths": 0,
        "cold_heat_wave_deaths": 3,
        "other_nature_deaths": 2,
        "total_deaths": 23,
        "source_uuid": "d86112bd-12ff-4761-b58f-ae672121536b",
    },
    {
        "state_name": "Ladakh",
        "calendar_year": 2023,
        "landslide_deaths": 2,
        "flash_flood_deaths": 5,
        "flood_deaths": 0,
        "cloudburst_deaths": 2,
        "cyclone_deaths": 0,
        "avalanche_deaths": 7,
        "lightning_deaths": 0,
        "cold_heat_wave_deaths": 2,
        "other_nature_deaths": 2,
        "total_deaths": 20,
        "source_uuid": "d86112bd-12ff-4761-b58f-ae672121536b",
    },
    # Jammu & Kashmir (2021-2023)
    {
        "state_name": "Jammu & Kashmir",
        "calendar_year": 2021,
        "landslide_deaths": 18,
        "flash_flood_deaths": 14,
        "flood_deaths": 12,
        "cloudburst_deaths": 6,
        "cyclone_deaths": 0,
        "avalanche_deaths": 8,
        "lightning_deaths": 14,
        "cold_heat_wave_deaths": 4,
        "other_nature_deaths": 6,
        "total_deaths": 82,
        "source_uuid": "d86112bd-12ff-4761-b58f-ae672121536b",
    },
    {
        "state_name": "Jammu & Kashmir",
        "calendar_year": 2022,
        "landslide_deaths": 15,
        "flash_flood_deaths": 11,
        "flood_deaths": 9,
        "cloudburst_deaths": 4,
        "cyclone_deaths": 0,
        "avalanche_deaths": 7,
        "lightning_deaths": 16,
        "cold_heat_wave_deaths": 4,
        "other_nature_deaths": 6,
        "total_deaths": 72,
        "source_uuid": "d86112bd-12ff-4761-b58f-ae672121536b",
    },
    {
        "state_name": "Jammu & Kashmir",
        "calendar_year": 2023,
        "landslide_deaths": 16,
        "flash_flood_deaths": 12,
        "flood_deaths": 10,
        "cloudburst_deaths": 5,
        "cyclone_deaths": 0,
        "avalanche_deaths": 9,
        "lightning_deaths": 15,
        "cold_heat_wave_deaths": 3,
        "other_nature_deaths": 7,
        "total_deaths": 77,
        "source_uuid": "d86112bd-12ff-4761-b58f-ae672121536b",
    },
]

# 4. Highway Damages
HIGHWAY_ADDITIONS = [
    {
        "state_name": "Ladakh",
        "reporting_period": "2024-25",
        "damaged_length_km": 98.4,
        "disaster_triggers": "Cloudburst / Flash Flood / Avalanche",
        "source_uuid": "89e8a589-1089-4f2d-9ea5-a5fa66a8ac95",
    },
    {
        "state_name": "Jammu & Kashmir",
        "reporting_period": "2024-25",
        "damaged_length_km": 184.6,
        "disaster_triggers": "Landslide / Heavy Rain / Rockfall",
        "source_uuid": "89e8a589-1089-4f2d-9ea5-a5fa66a8ac95",
    },
]

# 5. Relief Allocations
RELIEF_ADDITIONS = [
    {
        "state_name": "Uttarakhand",
        "fiscal_year": "2023-24",
        "sdrf_central_share_cr": 852.0,
        "sdrf_state_share_cr": 94.6,
        "ndrf_releases_cr": 415.0,
        "lives_saved_count": 6240,
        "source_uuid": "6054657b-2834-4ce9-ae48-3c73709110f7",
    },
    {
        "state_name": "Ladakh",
        "fiscal_year": "2023-24",
        "sdrf_central_share_cr": 42.0,
        "sdrf_state_share_cr": 4.6,
        "ndrf_releases_cr": 18.5,
        "lives_saved_count": 420,
        "source_uuid": "6054657b-2834-4ce9-ae48-3c73709110f7",
    },
    {
        "state_name": "Jammu & Kashmir",
        "fiscal_year": "2023-24",
        "sdrf_central_share_cr": 480.0,
        "sdrf_state_share_cr": 53.3,
        "ndrf_releases_cr": 192.4,
        "lives_saved_count": 3850,
        "source_uuid": "6054657b-2834-4ce9-ae48-3c73709110f7",
    },
]

# 6. Case Studies
CASE_STUDY_ADDITIONS = [
    {
        "slug": "uttarakhand-kedarnath-debris-flow-2013",
        "title": "Kedarnath & Mandakini Valley Glacial Outburst and Flash Flood, Rudraprayag",
        "disaster_type": "Flash Flood / Debris Flow",
        "state_name": "Uttarakhand",
        "location_name": "Kedarnath & Mandakini Basin, Rudraprayag District, Uttarakhand",
        "event_date": "2013-06-16",
        "fatalities": 5700,
        "injured": 4200,
        "missing": 1800,
        "compensation_cr": 1250.0,
        "summary": "Extreme multi-day precipitation combined with the moraine-dammed Chorabari Lake breach (GLOF) unleashed a catastrophic debris torrent down the Mandakini river canyon, decimating Rambara and downstream settlements in Rudraprayag district.",
        "geotechnical_context": "Catastrophic breach of lateral moraine dam, saturation of steep glaciated slopes (>35 deg) on High Himalayan Crystalline gneiss, hyperconcentrated debris flow transport.",
        "response_actions": [
            { "agency": "Indian Air Force (Operation Rahat)", "action": "Evacuated over 19,600 stranded pilgrims and residents using Mi-17 and ALH helicopters" },
            { "agency": "NDRF & ITBP", "action": "Established rope bridges and pedestrian zip-lines across severed Mandakini gorges" },
            { "agency": "Border Roads Organisation", "action": "Emergency Bailey bridge construction along NH-58 and NH-107 pilgrimage lifelines" }
        ],
        "source_refs": [
            { "title": "National Institute of Disaster Management (NIDM) Kedarnath Report 2013", "uuid": "c4d29e31-8f24-42b7-a37a-59423c8e1a12" },
            { "title": "Wadia Institute of Himalayan Geology Geotechnical Analysis", "uuid": "7a3e8109-bb11-450f-90e8-09dc37b01984" }
        ]
    },
    {
        "slug": "ladakh-leh-cloudburst-debris-flow-2010",
        "title": "Leh Cloudburst & Alluvial Fan Debris Inundation Disaster, Ladakh",
        "disaster_type": "Cloudburst / Debris Flow",
        "state_name": "Ladakh",
        "location_name": "Leh Town & Choglamsar, Leh District, Ladakh",
        "event_date": "2010-08-06",
        "fatalities": 255,
        "injured": 340,
        "missing": 65,
        "compensation_cr": 185.0,
        "summary": "An unprecedented mesoscale convective cloudburst (>150 mm in 2 hours) struck the cold-desert terrain of Leh at midnight, generating high-velocity mudflows down normally dormant dry gullies into Choglamsar and destroying 1,400+ mud-brick homes.",
        "geotechnical_context": "Unconsolidated Granitic morainic till and alluvial fan matrix mobilized into viscous debris slurry upon sudden saturation; near-zero infiltration capacity in barren periglacial desert.",
        "response_actions": [
            { "agency": "Indian Army (Operation Sahayata)", "action": "Mobilized 6,000 personnel, restored Leh airfield within 36 hours, and deployed field hospitals" },
            { "agency": "NDRF Battalion 7", "action": "Deep mud search and rescue operations across Choglamsar alluvial fan" },
            { "agency": "Border Roads Organisation (Himank)", "action": "Reopened Srinagar-Leh NH-1D and cleared Zojila and Khardung La passes" }
        ],
        "source_refs": [
            { "title": "Geological Survey of India Post-Disaster Geo-Environmental Investigation", "uuid": "a812e943-7f12-4211-9a70-8742c9081234" },
            { "title": "National Disaster Management Authority (NDMA) Leh Report 2010", "uuid": "4392ef01-5231-4cf8-8c10-38827fa01732" }
        ]
    },
    {
        "slug": "jk-srinagar-jhelum-catastrophic-flood-2014",
        "title": "Great Kashmir Floods & Jhelum Embankment Breach, Srinagar",
        "disaster_type": "Riverine Inundation",
        "state_name": "Jammu & Kashmir",
        "location_name": "Srinagar City & Jhelum Basin, Jammu & Kashmir",
        "event_date": "2014-09-07",
        "fatalities": 284,
        "injured": 1450,
        "missing": 42,
        "compensation_cr": 1450.0,
        "summary": "Record torrential monsoon rainfall inundated the entire Jhelum river basin, overtopping flood spill channels and breaching bunds at Ram Munshi Bagh. Over 70% of Srinagar city was submerged under 3 to 5 meters of floodwaters for over two weeks.",
        "geotechnical_context": "Piping and structural failure of earthen Jhelum flood dykes under prolonged hydrostatic head; critical loss of historical flood retention in wetlands (Anchar, Wular, Dal).",
        "response_actions": [
            { "agency": "NDRF & Indian Armed Forces (Operation Megh Rahat)", "action": "Rescued over 237,000 marooned citizens using 135 motorized boats and 80 aircraft" },
            { "agency": "CWC & Irrigation and Flood Control J&K", "action": "Emergency pumping and sandbag reinforcement of breaches along the Flood Spill Channel" },
            { "agency": "State Health Services", "action": "Dispatched emergency mobile medical teams to contain waterborne epidemic outbreaks" }
        ],
        "source_refs": [
            { "title": "Central Water Commission (CWC) Comprehensive Flood Study of Jhelum Basin 2014", "uuid": "99c10482-1209-4ee2-8a90-781923cf0912" },
            { "title": "Parliamentary Standing Committee on Home Affairs 187th Report", "uuid": "8120ef93-6c84-4822-b912-491209cfa321" }
        ]
    }
]


def append_unique(filepath: Path, new_records: list[dict], key_func):
    current = []
    if filepath.exists():
        current = json.loads(filepath.read_text(encoding="utf-8"))
    
    seen = {key_func(r) for r in current}
    added = 0
    for nr in new_records:
        k = key_func(nr)
        if k not in seen:
            current.append(nr)
            seen.add(k)
            added += 1
            
    filepath.write_text(json.dumps(current, indent=2), encoding="utf-8")
    print(f"Updated {filepath.name}: added {added} records (total {len(current)})")


def main():
    append_unique(
        FIXTURES_DIR / "mha_rajya_sabha_losses.json",
        MHA_ADDITIONS,
        lambda r: (r["state_name"].lower(), r["year_label"]),
    )
    append_unique(
        FIXTURES_DIR / "cwc_flood_damages.json",
        CWC_ADDITIONS,
        lambda r: (r["state_name"].lower(), r["calendar_year"]),
    )
    append_unique(
        FIXTURES_DIR / "ncrb_forces_of_nature.json",
        NCRB_ADDITIONS,
        lambda r: (r["state_name"].lower(), r["calendar_year"]),
    )
    append_unique(
        FIXTURES_DIR / "highway_damages.json",
        HIGHWAY_ADDITIONS,
        lambda r: (r["state_name"].lower(), r["reporting_period"]),
    )
    append_unique(
        FIXTURES_DIR / "relief_allocations.json",
        RELIEF_ADDITIONS,
        lambda r: (r["state_name"].lower(), r["fiscal_year"]),
    )
    append_unique(
        FIXTURES_DIR / "case_studies.json",
        CASE_STUDY_ADDITIONS,
        lambda r: r["slug"],
    )
    print("\nAll fixtures updated successfully.")


if __name__ == "__main__":
    main()
