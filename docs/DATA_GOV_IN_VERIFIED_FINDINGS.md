# data.gov.in — Verified Findings & Integration Handoff

**Status:** investigation complete, no code written.
**Verified:** 2026-09-17, by live probe against `api.data.gov.in` + the local FTS5 catalog index.
**Supersedes (in part):** `docs/DATA_GOV_IN_RELEVANT_APIS.md` — see §7 for four claims in that document that do not hold.

> **Read this before trusting `DATA_GOV_IN_RELEVANT_APIS.md`.** That document was written from catalog
> metadata only. Several of its schema listings do not match what the API actually returns, and its
> headline recommendation (Mission Antyodaya) does not cover either pilot district. Everything in
> *this* file was confirmed by calling the endpoint.

---

## 1. How these datasets were ranked

Not by how useful they sound. By one test:

> **Does this dataset close a gap the pipeline already admits to in its own docstrings?**

The codebase is unusually honest about its synthetic values. Three such gaps exist (§2). A dataset
that fills one is worth real effort; a dataset that merely adds a panel is not.

---

## 2. The three gaps in the code

These are the integration targets. All three are deliberate, documented NULLs or constants.

### Gap A — vulnerability is one flat number per district

`pipeline/src/pipeline/jobs/derive_habitations.py:15-17`

```
name                synthetic — no gazetteer exists; labels are positional, not toponyms
lgd_code            absent    — left NULL rather than invented
vulnerability       flat      — no SoVI source; one district-level value, is_district_flat = True
```

`DEFAULT_VULNERABILITY_ANCHOR = 0.5` (line 67) is applied to every habitation in a district.
`is_district_flat` is written `TRUE` unconditionally (line 259). Consequence: the SoVI term cannot
discriminate between villages, so triage order is driven entirely by hazard and exposure.

**Insertion point already exists.** `derive_habitations.py` accepts `--vulnerability-anchor`, and
`core/src/core/domain/vulnerability.py` already defines `DownscalingValidationStatus`,
`DimensionValidationResult` and `DistrictVulnerabilityValidationReport` — written, tested, unused.
Whoever wires in real SoVI should use that machinery rather than adding new validation.

### Gap B — candidate-site capacity constraints are unmeasured

`pipeline/src/pipeline/jobs/derive_candidate_sites.py:12`

```
Deliberately left NULL: `cc_water`, `cc_school`, `cc_health`. No CGWB groundwater, UDISE+ school
or IPHS health data exists in this repo, and the capacity engine already treats None as
"unmeasured" rather than zero
```

Only `cc_land` (pure geometry from parcel area) is real.

### Gap C — fixture capacity is fabricated from land area

`pipeline/scripts/load_barpeta_assessment_fixture.py:159-161`

```python
water_synthetic  = min(cc_land, 1500)
school_synthetic = min(cc_land, 1200)
health_synthetic = min(cc_land, 1000)
```

Related: `adverse_trend` and `fatal_event_last_3_monsoons` are hand-written per-habitation in
`pipeline/src/pipeline/jobs/seed_pilot_data.py`; `disaster_event` rows are seeded from the same
fixture rather than an observational source.

---

## 3. Live probe results

All six endpoints called with the public sample key, `format=json`. **Every one returned HTTP 200
and `status: ok`.** Openness was never the discriminator — row count and granularity were.

| Dataset | UUID | HTTP | Total rows | Dhaulpur | Morena | Verdict |
|---|---|---|---|---|---|---|
| All India Health Centres Directory | `db2e3a80-ea7a-4ead-987a-9564fcee3c08` | 200 | **200,438** | 266 | 288 | ✅ geocoded, use it |
| NIN Health Facilities (geocoded) | `0dfebd78-bac4-44be-9291-025a983323f4` | 200 | **192,905** | national | national | ✅ cross-check source |
| JJM Schools / habitations | `3f719ae6-c346-46f9-98ff-4add5bdc1881` | 200 | **963,877** | 506 | 2,359 | ✅ use it |
| Census PCA 2011 — Dhaulpur | `8707bbf4-31ec-49fa-8eeb-b23e748b9788` | 200 | 834 (**819** at VILLAGE level) | 819 | n/a | ✅ use it |
| Census PCA 2001 — Morena | `9ca3d4da-3e72-47eb-8bc8-677551119a38` | — | not probed | n/a | yes | ⚠️ 2001 vintage |
| CGWB groundwater levels | `2b787738-ec56-4c2a-84cb-8d41ddd0e9bc` | 200 | **23** (Punjab districts only) | 0 | 0 | ❌ open but empty here |
| Groundwater contamination | `e6484423-9440-4b49-95a4-51c1d1a45a1c` | 200 | **33** (one row per state/UT) | state only | state only | ❌ too coarse |

### Confirmed sample payloads

**Health** (`db2e3a80`) — JSON keys, note the leading underscores:
```
state_name, district_name, subdistrict_name, facility_type, facility_name,
facility_address, _latitude, _longitude, activeflag_c, notional_physical,
location_type, type_of_facility, nin_n
```
```json
{"facility_type":"chc","facility_name":"CHC Pahargarh",
 "_latitude":"26.19799","_longitude":"77.639745","activeflag_c":"Y"}
```

**JJM** (`3f719ae6`):
```
state_name, district_name, block_name, panchayat_name, village_name,
habitation_name, habitation_id, school_id, school_name, no_of_student,
school_category, school_subcategory, data_gov_update_date
```
```json
{"habitation_id":"0000818493","habitation_name":"Paraua",
 "village_name":"Paraua","no_of_student":"554"}
```

**Census PCA 2011 Dhaulpur** (`8707bbf4`) — 96 fields, village rows:
```json
{"name":"Bharli","town_village_code":"075363","no_of_households":"344",
 "total_population_person":"2174","scheduled_castes_population_person":"154",
 "literates_population_person":"1305",
 "main_agricultural_labourers_population_person":"36"}
```

---

## 4. Tiers

### Tier 1 — closes Gap A outright · effort LOW–MED · benefit VERY HIGH

| Dataset | UUID | Notes |
|---|---|---|
| Village/Town-wise PCA 2011 — Dhaulpur | `8707bbf4-31ec-49fa-8eeb-b23e748b9788` | 819 village rows, 96 fields. Join on `town_village_code`. |
| PCA 2001 — Morena | `9ca3d4da-3e72-47eb-8bc8-677551119a38` | Only village-level census in the catalog for Morena. 2001 vintage. |

Maps onto the SoVI dimensions roughly as:

- `v_demographic` ← `population_in_the_age_group_0_6_*`, `scheduled_castes_population_*`, `scheduled_tribes_population_*`
- `v_economic` ← `main_agricultural_labourers_population_*`, `marginal_worker_population_*`, `non_working_population_*`
- `v_access` ← **not in PCA** — use the geocoded health directory (Tier 2) for distance-to-facility
- `v_structural` ← **not in PCA** — no source found for either pilot; keep flagged or leave neutral

**Do not silently compare the two pilots.** Dhaulpur gets 2011 data, Morena 2001. Load with distinct
`dataset_version` values and let `data_quality` reflect it.

### Tier 2 — real values for currently-synthetic fields · effort MED · benefit HIGH

| Dataset | UUID | Closes |
|---|---|---|
| All India Health Centres Directory | `db2e3a80-ea7a-4ead-987a-9564fcee3c08` | `cc_health` (Gap B/C), `v_access` via PostGIS `ST_Distance` to nearest `activeflag_c='Y'` facility |
| JJM Schools / habitations | `3f719ae6-c346-46f9-98ff-4add5bdc1881` | synthetic habitation names, NULL `lgd_code`, `cc_school` — **partial coverage, see below** |
| Daily District-wise Rainfall | `6c05cd1b-ed59-40c2-bc31-e314f39c6971` | second provenance on dynamic triggers alongside Open-Meteo |

#### What "habitation" means, and why JJM only half-delivers it

**JJM** = Jal Jeevan Mission (Ministry of Jal Shakti, "Har Ghar Jal"). A **habitation** is a real
administrative tier below the revenue village:

```
State -> District -> Block -> Gram Panchayat -> Revenue Village -> Habitation
```

A *revenue village* is a land-record unit (a cadastral boundary for title and taxation). A
*habitation* is the actual physical cluster of dwellings — the hamlet, locally a tola / basti /
para / dhani / purwa. One revenue village routinely contains several habitations, sometimes
kilometres apart. Roughly 10% of probed Dhaulpur rows carry a habitation name distinct from its
village (village Chhetapura -> habitation Cheeta Pura; Gopalpura -> Balla Pura).

**This is the correct unit for SETU-DRR** and the one the schema already uses (`Habitation`,
`habitation_risk`, per-habitation relocation plans). Hazard exposure varies *within* a revenue
village — one hamlet on the riverbank floods, another on higher ground does not. You relocate a
cluster of houses, not a cadastral polygon. `habitation_id` is an official 10-digit DDWS code and
therefore a join key into other government systems.

**Three caveats, in order of severity:**

1. **It is a school registry, not a habitation census.** The dataset is *"Schools with Tap
   Connection under JJM"* — it enumerates only habitations that contain a school. Dhaulpur returns
   506 rows against 819 villages in PCA. Habitations without a school are absent entirely. Use it to
   attach real names and official IDs to settlements already derived from the raster; it **cannot**
   enumerate them. An earlier draft of this document called it "the only authoritative habitation
   gazetteer in the catalog" — that overstates it.
2. **No coordinates.** Linking `habitation_id` to derived settlements is a fuzzy name match on
   `village_name` / `block_name`. Budget a manual review pass for ambiguous matches, and never let a
   low-confidence match overwrite a measured centroid.
3. **The sample key caps responses at 10 rows** regardless of the `limit` parameter (requested 600
   and 100, got 10 both times; `offset` does page correctly). At that rate a full pull of 963,877
   rows is ~96,000 requests. **Re-test with a registered key before planning bulk ingestion** — if
   the cap holds, this dataset is not viable to pull in full.

**Rainfall is about defensibility, not accuracy.** The dynamic-hazard trigger currently rests on
Open-Meteo alone. An Indian government series running beside it changes "a forecast API said so"
into "the national rainfall record agrees" — worth more than the marginal precision in an
evaluation setting.

### Tier 3 — cheap credibility, bounded value · effort LOW · benefit MODERATE

| Dataset | UUID | Use |
|---|---|---|
| State/UT-wise flood damages (CWC) | `16c52e9c-1284-4238-8d13-f22158d217b3` | back-test baseline; validation panel, **not** a scoring input |
| Accidental Deaths — Forces of Nature (NCRB 2023) | `d86112bd-12ff-4761-b58f-ae672121536b` | defensible relative casualty weights per hazard type |
| SDRF & NDRF fund allocation | `6054657b-2834-4ce9-ae48-3c73709110f7` | grounds hand-written `mitigation_cost` / `relocation_cost` in a real budget ceiling |
| PMGSY physical & financial progress | `d4361151-6d41-43c7-98cd-9a6cd90b5ca4` | district road context only — **cannot** feed `v_access` |

### Tier 4 — do not build on these

| Dataset | UUID | Why not |
|---|---|---|
| Mission Antyodaya village survey | various | **Covers 9 small states/UTs only.** No Rajasthan, no MP. |
| CGWB groundwater levels | `2b787738-ec56-4c2a-84cb-8d41ddd0e9bc` | 23 rows, Punjab only, depth *bands* not wells. No coordinates. |
| Groundwater contamination | `e6484423-9440-4b49-95a4-51c1d1a45a1c` | 33 rows, `state_ut` is the only geography column. |
| District-wise health centre counts | `39c05e0a-e428-46f3-aacd-0dbb1d51f65e` | March 2011 counts, no coordinates. Superseded by `db2e3a80`. |

**Mission Antyodaya, in full.** The only village-wise survey files on the portal are:
Sikkim `37b67864`, Mizoram `5a4c0ceb`, DNH&DD `5390b5b9`, Kerala `dc53040e`, Ladakh `38212fb9`,
Tripura `db60baa9`, Nagaland `44025d9c`, Manipur `c7abc427`, Goa `4465bbc3`.
It genuinely is the richest village SoVI source in the catalog — 162 indicators including kuccha
wall/roof counts, BPL cards, all-weather road, PHC/CHC availability. It would be the Tier 1 pick
the moment a pilot moves to one of those states. **Today it is the strongest argument for adding a
Kerala or Sikkim pilot — not a dataset that can be integrated for Chambal.**

**`cc_water` should stay NULL.** No source in the catalog supports per-parcel groundwater. The
capacity engine already distinguishes "unmeasured" from "zero"; deriving a value from a state-level
percentage would fabricate precision the source does not have. Leaving it NULL is the correct
behaviour, not a gap to be papered over.

---

## 5. Pilot coverage matrix

Pilots are **Dhaulpur (Rajasthan)** and **Morena (Madhya Pradesh)** — see
`pipeline/src/pipeline/hazard/flood/districts.py:69-93`. The catalog is national; coverage is not.

| Source | Dhaulpur | Morena | Granularity |
|---|---|---|---|
| Primary Census Abstract 2011 | ✅ `8707bbf4` | ❌ absent (MP has Raisen only) | Village |
| Primary Census Abstract 2001 | ✅ `4c93f499` | ✅ `9ca3d4da` | Village |
| Mission Antyodaya | ❌ | ❌ | Village |
| Geocoded health directory | ✅ 266 | ✅ 288 | Facility point |
| JJM habitation gazetteer | ✅ 506 | ✅ 2,359 | Habitation |
| UDISE+ school infrastructure | ⚠️ district files | ✅ 2016-17, 2017-18 | District |
| Daily rainfall (NWIC) | ✅ | ✅ | District / daily |
| CGWB groundwater | ❌ Punjab only | ❌ Punjab only | District bands |

Village-level PCA 2011 exists for **291 districts across 23 states**. Madhya Pradesh has exactly one
(Raisen), which is why Morena falls back to 2001.

---

## 6. Integration gotchas

These each cost real debugging time. All four were hit during verification.

### 6.1 The district is spelled "Dhaulpur"

`filters[district_name]=Dholpur` returns `total: 0` with **HTTP 200 and no error** on both the health
directory and JJM. Only `Dhaulpur` matches — the same spelling `districts.py` already carries as
`shapefile_district_name`. A silent empty result is the failure mode here; assert on row count, do
not just check for exceptions.

### 6.2 data.gov.in hangs on Python's default User-Agent

An identical request **times out** under `Python-urllib/3.x` and succeeds in under a second with
`User-Agent: curl/8.7.1`. The server does not reject — it never answers, so a naive client looks
like a network fault. Verified both ways on `e6484423`.

```python
req = urllib.request.Request(url, headers={"User-Agent": "curl/8.7.1"})
```

Set an explicit User-Agent in whatever client the ingestion script uses.

### 6.3 JSON keys are not the catalog's field names

They arrive snake-cased and mangled: `_latitude`, `_longitude`, `sl__no_`,
`no__of_percentage_of_wells_showing_depth_to_water_level__mbgl__in_the_range_of_0_to_2_year___no_`.
**Map from a live response, never from the `data_fields` metadata string.**

Also: the CGWB depth columns are labelled "0 to 2 **year**" where the unit is actually metres below
ground level. The source itself is mislabelled.

### 6.4 PCA mixes aggregation levels in one table

`8707bbf4` returns 834 rows, of which 819 are `level=VILLAGE`. The other 15 are `DISTRICT` and
`CD BLOCK` aggregates **in the same table**. Filter on `level` or you will double-count the district
into its own villages.

### 6.5 Rate limits

The public sample key returned `HTTP 429 — Rate limit exceeded` under a burst of six sequential
calls, then recovered on its own. `DATA_GOV_IN_API_KEY` already exists in `.env.example` and is
empty — register a real key before any bulk pull.

Standard call shape:
```
https://api.data.gov.in/resource/<uuid>?api-key=<key>&format=json&limit=<n>&offset=<n>
                                        &filters[<field>]=<value>
```

**Keep the existing architectural guidance:** pre-ingest to fixtures. Never put a government portal
in the request path of a live evaluation.

---

## 7. Corrections to `DATA_GOV_IN_RELEVANT_APIS.md`

Four claims in that document do not survive checking the API.

| # | Doc claims | Actually |
|---|---|---|
| 1 | Mission Antyodaya is "the single most comprehensive village-level SoVI dataset in India", listed as a primary integration target | Nine small states/UTs only. **No Rajasthan, no Madhya Pradesh** — it cannot serve either pilot. |
| 2 | CGWB `2b787738` schema is `Well_No, Pre-monsoon water level (m), Post-monsoon water level (m), Net fluctuation`, nationally scoped | Punjab, Nov 2023, **23 rows**. District-level counts and percentages of wells per depth band. No well IDs, no coordinates, no fluctuation column. |
| 3 | Contamination `e6484423` schema is `State/UT, District, Nitrate Occurrence…`, proposed for per-site screening | **No district column.** 33 rows, one per state/UT, percentages of samples exceeding thresholds. |
| 4 | District health centres `39c05e0a` "calculates travel time and distance to nearest emergency medical triage facility" | That dataset is a **March 2011 count table with no coordinates**. The capability is real but belongs to `db2e3a80`. |

---

## 8. Suggested build order

Sequenced so each step lands a visible change in the triage output.

1. **Census PCA 2011 → per-village SoVI for Dhaulpur.** Kills the flat `0.5`, flips
   `is_district_flat`. Largest single credibility gain; anchor plumbing already written.
2. **Geocoded health directory → `cc_health` and `v_access`.** Replaces `min(cc_land, 1000)` with a
   PostGIS distance to the nearest active facility.
3. **Daily rainfall → second provenance on dynamic triggers.** Half a day; makes the trigger story
   defensible to a government evaluator.
4. **JJM gazetteer → real habitation names and IDs.** Highest polish-per-screen for the triage
   table, but the name-matching pass is the longest job here. Schedule after the scoring work.
5. **Relief and damage tables → calibration and cost envelope.** Small flat files. Wire to the
   validation panel and cost fields, not to the score.

---

## 9. Reproducing this

Local catalog (467 MB CSV → SQLite FTS5, already built at `data/data_gov_apis.db`, 267,510 datasets):

```bash
python3 scripts/query_gov_apis.py stats
python3 scripts/query_gov_apis.py inspect <dataset_uuid>
python3 scripts/query_gov_apis.py search "landslide OR flood" --open-only --limit 10
```

Direct SQL against the index — faster for coverage questions than the CLI:

```bash
sqlite3 data/data_gov_apis.db \
  "SELECT dataset_uuid, title FROM apis WHERE title LIKE '%Village/Town-wise Primary Census Abstract, 2011%';"
```

Live probe (note the User-Agent requirement from §6.2 if not using curl):

```bash
K=<your-key>
curl -s "https://api.data.gov.in/resource/db2e3a80-ea7a-4ead-987a-9564fcee3c08?api-key=$K&format=json&limit=2&filters%5Bdistrict_name%5D=Dhaulpur"
```

---

## 10. What is NOT done

- **No code written.** No loader, no migration, no ingestion job exists for any of this.
- **PCA 2001 Morena (`9ca3d4da`) was not probed live** — only its catalog metadata was read. Verify
  row count and `level` distribution before relying on it.
- **UDISE+ was not probed.** District-level files exist for Morena (2016-17, 2017-18); their value
  for `cc_school` is unassessed, and JJM is the better path anyway.
- **No SoVI weighting scheme proposed.** §4 gives a field-to-dimension mapping, not calibrated
  weights. `VulnerabilityConfig` defaults to equal 0.25 weights; whether that survives contact with
  real PCA data is an open question.
- **No `v_structural` source found** for either pilot. PCA has no housing-condition columns. Mission
  Antyodaya has them (kuccha wall/roof) but does not cover Rajasthan or MP.
- **Row-limit cap is unresolved.** The sample key returned 10 rows per call regardless of `limit`.
  Whether a registered key lifts this is untested and determines whether the large datasets
  (JJM 963,877 rows; health 200,438) can be bulk-pulled at all. **Test this first** — it gates
  Tier 2 entirely.
- **No complete habitation enumeration exists** in the catalog for either pilot. JJM covers only
  school-bearing habitations (§4). Settlements must still be derived from the WorldPop raster; gov
  data can name and identify them, not replace the derivation.
