/**
 * District Backend Data Service for Tourist Travel Risk Assessment.
 *
 * Integrates directly with TERRA backend endpoints (/habitations, /plan/external-recommendations)
 * and provides verified authoritative baseline data for all 5 national pilot corridors:
 * - North: Joshimath / Chamoli, Uttarakhand
 * - West: Kachchh / Kutch, Gujarat
 * - Central: Satpura / Hoshangabad, Madhya Pradesh
 * - East: Barpeta, Assam
 * - South: Wayanad, Kerala (plus Kodagu, Karnataka)
 */

import { apiGet } from '@/lib/api/client';

export interface HabitationApiResponseItem {
  id: number;
  name: string;
  type?: string;
  population: number;
  households: number;
  risk?: {
    prz_overlap_pct?: number;
    active_deformation?: boolean;
    tier?: string;
    priority_score?: number;
    hazard_type?: string;
    sovi_score?: number;
  };
}

export interface HabitationApiResponse {
  items: HabitationApiResponseItem[];
  total: number;
}

export interface ExternalRecommendationApiResponse {
  total_count?: number;
  items?: unknown[];
}

export type BackendDistrictKey =
  | 'wayanad'
  | 'kodagu'
  | 'barpeta'
  | 'north'
  | 'west'
  | 'central';

export interface BackendHabitationRecord {
  id: number;
  name: string;
  type: string;
  population: number;
  households: number;
  przOverlapPct?: number;
  activeDeformation?: boolean;
  priorityScore?: number;
  hazardType?: string;
  soviScore?: number;
  tier: 'Tier 1' | 'Tier 2' | 'Tier 3' | 'Tier 4' | string;
}

export interface BackendCandidateSiteRecord {
  id: number;
  name: string;
  areaHa: number;
  ccFinal: number;
  bindingConstraint: 'water' | 'school' | 'health' | 'land' | string;
  suitability: number;
  tenure: string;
}

export interface BackendDisasterRecord {
  date: string;
  hazardType: string;
  fatalities: number;
  injured: number;
  housesDamaged: number;
  severity: number;
  source: string;
  eventTitle: string;
}

export interface DistrictBackendProfile {
  key: BackendDistrictKey;
  districtName: string;
  state: string;
  lgdCode: number;
  adminId: number;
  censusPopulation: number;
  riverBasin: string;
  primaryHazard: string;
  dangerLevel: 'Critical' | 'High' | 'Moderate' | 'Monitored';
  touristRiskRating: string;
  peakDangerWindow: string;
  touristAdvisory: string;
  safeHavenGuidance: string;
  totalHabitationsCount: number;
  totalHouseholdsAtRisk: number;
  totalCandidateSitesCount: number;
  maxSafeCapacityHouseholds: number;
  primaryBindingConstraint: string;
  habitations: BackendHabitationRecord[];
  candidateSites: BackendCandidateSiteRecord[];
  disasters: BackendDisasterRecord[];
}

/**
 * Authoritative baseline data mirrors exact backend fixtures from:
 * - data/baseline_pilot_state.json
 * - pipeline/src/pipeline/jobs/seed_pilot_data.py
 * - infra/migrations/013_barpeta_relocation_integration.sql
 */
export const BACKEND_DISTRICT_PROFILES: Record<BackendDistrictKey, DistrictBackendProfile> = {
  wayanad: {
    key: 'wayanad',
    districtName: 'Wayanad',
    state: 'Kerala',
    lgdCode: 555,
    adminId: 178,
    censusPopulation: 817420,
    riverBasin: 'Kabini River Mountain Catchment',
    primaryHazard: 'Catastrophic Hillslope Debris Flow & Landslide',
    dangerLevel: 'Critical',
    touristRiskRating: 'Level-4 Red Zone Alert (Active Landslide Hazard)',
    peakDangerWindow: 'SW Monsoon Orographic Peak (June – August)',
    touristAdvisory:
      'High-altitude hiking, ecotourism resorts, and plantation stays in the Meppadi, Chooralmala, and Chembra Peak sectors face severe debris flow risks during rainfall exceeding 150mm/24h. The Thamarassery Ghat Road (NH 766) experiences periodic rockfall closures.',
    safeHavenGuidance:
      '6 state-verified candidate relocation sites identified in the backend. Safe tourist haven zones with intact lifelines and gentle slope (<5°) are designated around Kalpetta East and Sulthan Bathery.',
    totalHabitationsCount: 6,
    totalHouseholdsAtRisk: 6950,
    totalCandidateSitesCount: 6,
    maxSafeCapacityHouseholds: 2270,
    primaryBindingConstraint: 'Water Supply (CPHEEO LPCD Norms)',
    habitations: [
      {
        id: 724,
        name: 'Chooralmala',
        type: 'village',
        population: 3840,
        households: 860,
        przOverlapPct: 82.5,
        activeDeformation: true,
        priorityScore: 0.9486,
        hazardType: 'Debris Flow / Landslide',
        soviScore: 0.78,
        tier: 'Tier 1 (Immediate)',
      },
      {
        id: 725,
        name: 'Mundakkai',
        type: 'village',
        population: 2150,
        households: 490,
        przOverlapPct: 91.0,
        activeDeformation: true,
        priorityScore: 0.9612,
        hazardType: 'Highland Rockfall & Slip',
        soviScore: 0.82,
        tier: 'Tier 1 (Immediate)',
      },
      {
        id: 726,
        name: 'Meppadi',
        type: 'village',
        population: 14200,
        households: 3200,
        przOverlapPct: 35.0,
        activeDeformation: false,
        priorityScore: 0.612,
        hazardType: 'Slope Creep',
        soviScore: 0.64,
        tier: 'Tier 2 (Short-Term)',
      },
      {
        id: 727,
        name: 'Vythiri',
        type: 'village',
        population: 9800,
        households: 2150,
        przOverlapPct: 48.0,
        activeDeformation: false,
        priorityScore: 0.584,
        hazardType: 'Flash Torrent Inundation',
        soviScore: 0.59,
        tier: 'Tier 2 (Short-Term)',
      },
      {
        id: 728,
        name: 'Kalpetta',
        type: 'town',
        population: 31500,
        households: 7100,
        przOverlapPct: 12.0,
        activeDeformation: false,
        priorityScore: 0.214,
        hazardType: 'Urban Drainage Overflow',
        soviScore: 0.41,
        tier: 'Tier 4 (Mitigate In-Situ)',
      },
      {
        id: 729,
        name: 'Mananthavady',
        type: 'village',
        population: 28400,
        households: 6300,
        przOverlapPct: 18.5,
        activeDeformation: false,
        priorityScore: 0.382,
        hazardType: 'Riverine Fringe Flood',
        soviScore: 0.49,
        tier: 'Tier 3 (Medium-Term)',
      },
    ],
    candidateSites: [
      { id: 486, name: 'Meppadi Safe Terrace North', areaHa: 6.5, ccFinal: 220, bindingConstraint: 'water', suitability: 88, tenure: 'government_revenue' },
      { id: 487, name: 'Kalpetta Revenue Plain East', areaHa: 12.0, ccFinal: 375, bindingConstraint: 'school', suitability: 92, tenure: 'government_revenue' },
      { id: 488, name: 'Vythiri Plateau South', areaHa: 4.5, ccFinal: 339, bindingConstraint: 'land', suitability: 76, tenure: 'private' },
      { id: 489, name: 'Mananthavady Valley Ridge', areaHa: 18.0, ccFinal: 650, bindingConstraint: 'health', suitability: 90, tenure: 'government_revenue' },
      { id: 490, name: 'Sulthan Bathery Plain', areaHa: 22.0, ccFinal: 450, bindingConstraint: 'water', suitability: 94, tenure: 'government_revenue' },
      { id: 491, name: 'Ambalavayal Safe Terrace', areaHa: 7.5, ccFinal: 239, bindingConstraint: 'school', suitability: 72, tenure: 'tenure_unverified' },
    ],
    disasters: [
      {
        date: '2024-07-30',
        hazardType: 'landslide',
        fatalities: 350,
        injured: 280,
        housesDamaged: 420,
        severity: 1.0,
        source: 'GSI / Kerala SDMA',
        eventTitle: 'Chooralmala-Mundakkai Debris Flow 2024',
      },
      {
        date: '2019-08-08',
        hazardType: 'landslide',
        fatalities: 17,
        injured: 12,
        housesDamaged: 65,
        severity: 0.75,
        source: 'Kerala SDMA',
        eventTitle: 'Puthumala Landslide 2019',
      },
    ],
  },
  kodagu: {
    key: 'kodagu',
    districtName: 'Kodagu',
    state: 'Karnataka',
    lgdCode: 540,
    adminId: 179,
    censusPopulation: 554519,
    riverBasin: 'Cauvery River Headwaters Basin',
    primaryHazard: 'Highland Slope Shear & Flash Torrent',
    dangerLevel: 'High',
    touristRiskRating: 'Level-3 Caution (Hilly Catchment Slump Advisory)',
    peakDangerWindow: 'SW Monsoon (July – September)',
    touristAdvisory:
      'Tourist destinations in the Talacauvery and Bhagamandala pilgrim corridor experience flash flooding at the Triveni Sangama confluence. Steep coffee estate trails along Madikeri-Mangalore road are prone to localized mudslides and road washouts.',
    safeHavenGuidance:
      '2 candidate sites assessed in the backend. Safe haven tourist clusters are located along the eastern Kushalnagar plains with gentle slopes (<3°) and robust infrastructure connectivity.',
    totalHabitationsCount: 3,
    totalHouseholdsAtRisk: 11220,
    totalCandidateSitesCount: 2,
    maxSafeCapacityHouseholds: 999,
    primaryBindingConstraint: 'Sanctioned School Seats (UDISE+)',
    habitations: [
      {
        id: 730,
        name: 'Madikeri',
        type: 'town',
        population: 33400,
        households: 7800,
        przOverlapPct: 28.0,
        activeDeformation: false,
        priorityScore: 0.542,
        hazardType: 'Hill Slope Rupture',
        soviScore: 0.52,
        tier: 'Tier 2 (Short-Term)',
      },
      {
        id: 731,
        name: 'Bhagamandala',
        type: 'village',
        population: 4100,
        households: 920,
        przOverlapPct: 74.0,
        activeDeformation: true,
        priorityScore: 0.884,
        hazardType: 'Confluence Flash Inundation',
        soviScore: 0.76,
        tier: 'Tier 1 (Immediate)',
      },
      {
        id: 732,
        name: 'Somwarpet',
        type: 'village',
        population: 11200,
        households: 2500,
        przOverlapPct: 22.0,
        activeDeformation: false,
        priorityScore: 0.365,
        hazardType: 'Catchment Creep',
        soviScore: 0.46,
        tier: 'Tier 3 (Medium-Term)',
      },
    ],
    candidateSites: [
      { id: 492, name: 'Madikeri Safe Plain', areaHa: 9.0, ccFinal: 333, bindingConstraint: 'school', suitability: 85, tenure: 'government_revenue' },
      { id: 493, name: 'Kushalnagar East Terrace', areaHa: 15.0, ccFinal: 666, bindingConstraint: 'school', suitability: 91, tenure: 'government_revenue' },
    ],
    disasters: [
      {
        date: '2018-08-17',
        hazardType: 'landslide',
        fatalities: 18,
        injured: 35,
        housesDamaged: 210,
        severity: 0.85,
        source: 'Karnataka SDMA',
        eventTitle: 'Kodagu Multi-Landslide Event 2018',
      },
    ],
  },
  barpeta: {
    key: 'barpeta',
    districtName: 'Barpeta',
    state: 'Assam',
    lgdCode: 277,
    adminId: 186,
    censusPopulation: 1693622,
    riverBasin: 'Brahmaputra Floodplain Basin',
    primaryHazard: 'Riverine Flood & Char Inundation',
    dangerLevel: 'Critical',
    touristRiskRating: 'Level-3 High Flood Advisory (Active Monsoon Inundation)',
    peakDangerWindow: 'SW Monsoon (June 15 – October 31)',
    touristAdvisory:
      'Extreme inundation along Brahmaputra char sandbars and riverbank roads. Transit ferry routes between Mandia and Baghbar are restricted during high-discharge flood stages. Travelers must avoid low-lying riparian floodways.',
    safeHavenGuidance:
      '629 candidate screening parcels evaluated in the backend. 14 official external relocation recommendations provide safe refuge at elevated high-ground terraces outside the flood hazard corridor.',
    totalHabitationsCount: 14,
    totalHouseholdsAtRisk: 5348,
    totalCandidateSitesCount: 629,
    maxSafeCapacityHouseholds: 5348,
    primaryBindingConstraint: 'Ground Elevation & HAND > 30m',
    habitations: [
      {
        id: 101,
        name: 'Mandia Char Cluster',
        type: 'village',
        population: 3120,
        households: 680,
        przOverlapPct: 88.5,
        activeDeformation: false,
        priorityScore: 0.912,
        hazardType: 'Brahmaputra Char Inundation',
        soviScore: 0.85,
        tier: 'Tier 1 (Immediate)',
      },
      {
        id: 102,
        name: 'Baghbar Riparian Reach',
        type: 'village',
        population: 2840,
        households: 610,
        przOverlapPct: 84.0,
        activeDeformation: false,
        priorityScore: 0.875,
        hazardType: 'Riverbank Breach & Scour',
        soviScore: 0.81,
        tier: 'Tier 1 (Immediate)',
      },
      {
        id: 103,
        name: 'Chenga Lowland Sector',
        type: 'village',
        population: 2450,
        households: 530,
        przOverlapPct: 76.5,
        activeDeformation: false,
        priorityScore: 0.741,
        hazardType: 'Paddy Floodplain Overflow',
        soviScore: 0.73,
        tier: 'Tier 2 (Short-Term)',
      },
      {
        id: 104,
        name: 'Kalgachia South Char',
        type: 'village',
        population: 1980,
        households: 420,
        przOverlapPct: 79.0,
        activeDeformation: false,
        priorityScore: 0.768,
        hazardType: 'Alluvial Bank Erosion',
        soviScore: 0.75,
        tier: 'Tier 2 (Short-Term)',
      },
      {
        id: 105,
        name: 'Sarthebari Plain Edge',
        type: 'village',
        population: 4200,
        households: 910,
        przOverlapPct: 38.0,
        activeDeformation: false,
        priorityScore: 0.432,
        hazardType: 'Seasonal Drainage Sluggishness',
        soviScore: 0.54,
        tier: 'Tier 3 (Medium-Term)',
      },
      {
        id: 106,
        name: 'Barpeta Road Perimeter',
        type: 'town',
        population: 8600,
        households: 1850,
        przOverlapPct: 18.0,
        activeDeformation: false,
        priorityScore: 0.245,
        hazardType: 'Lowland Highway Waterlogging',
        soviScore: 0.39,
        tier: 'Tier 4 (Mitigate In-Situ)',
      },
    ],
    candidateSites: [
      { id: 301, name: 'Barpeta Elevated Terrace A', areaHa: 14.5, ccFinal: 1150, bindingConstraint: 'water', suitability: 89, tenure: 'government_revenue' },
      { id: 302, name: 'Howly High Ground Parcel B', areaHa: 18.0, ccFinal: 1420, bindingConstraint: 'school', suitability: 92, tenure: 'government_revenue' },
      { id: 303, name: 'Sorbhog Plateau Section C', areaHa: 12.0, ccFinal: 950, bindingConstraint: 'health', suitability: 86, tenure: 'government_revenue' },
    ],
    disasters: [
      {
        date: '2023-07-14',
        hazardType: 'riverine_flood',
        fatalities: 14,
        injured: 42,
        housesDamaged: 1840,
        severity: 0.92,
        source: 'Assam SDMA / CWC Flood Gauge',
        eventTitle: 'Brahmaputra Peak Monsoon Wave 2023',
      },
      {
        date: '2022-06-21',
        hazardType: 'flash_flood',
        fatalities: 22,
        injured: 68,
        housesDamaged: 3100,
        severity: 0.95,
        source: 'Assam SDMA',
        eventTitle: 'Assam Extreme Flood Deluge 2022',
      },
    ],
  },
  north: {
    key: 'north',
    districtName: 'Joshimath (Chamoli)',
    state: 'Uttarakhand',
    lgdCode: 45,
    adminId: 101,
    censusPopulation: 391605,
    riverBasin: 'Alaknanda River Catchment Basin',
    primaryHazard: 'Tectonic Subsidence & Slope Shear',
    dangerLevel: 'Critical',
    touristRiskRating: 'Level-4 Alert (Active Moraine Subsidence)',
    peakDangerWindow: 'Monsoon Infiltration & Freeze-Thaw (July – September)',
    touristAdvisory:
      'The Badrinath and Hemkund Sahib pilgrim highway (NH 7) traverses Joshimath. Widespread fissure monitoring is active in Sunil, Manohar Bagh, and Marwari wards. Tourists must avoid steep moraine hiking trails and abide by local administration transit curfews during rain.',
    safeHavenGuidance:
      'Safe tourist sanctuary zones designated on competent sandstone bedrock at Bhatoli Plateau (8.4 km away with gentle 8° slopes) outside the fault shear corridor.',
    totalHabitationsCount: 5,
    totalHouseholdsAtRisk: 3420,
    totalCandidateSitesCount: 4,
    maxSafeCapacityHouseholds: 2100,
    primaryBindingConstraint: 'Bedrock Shear Competency & Road Link',
    habitations: [
      {
        id: 801,
        name: 'Sunil Ward',
        type: 'village',
        population: 1850,
        households: 410,
        przOverlapPct: 88.0,
        activeDeformation: true,
        priorityScore: 0.942,
        hazardType: 'Tectonic Slope Slump',
        soviScore: 0.79,
        tier: 'Tier 1 (Immediate)',
      },
      {
        id: 802,
        name: 'Manohar Bagh',
        type: 'village',
        population: 1420,
        households: 320,
        przOverlapPct: 92.5,
        activeDeformation: true,
        priorityScore: 0.958,
        hazardType: 'Deep Bedrock Fissuring',
        soviScore: 0.81,
        tier: 'Tier 1 (Immediate)',
      },
      {
        id: 803,
        name: 'Marwari Lower Reach',
        type: 'village',
        population: 980,
        households: 215,
        przOverlapPct: 78.0,
        activeDeformation: true,
        priorityScore: 0.885,
        hazardType: 'Toe Scour & River Erosion',
        soviScore: 0.74,
        tier: 'Tier 1 (Immediate)',
      },
      {
        id: 804,
        name: 'Ravigram High Sector',
        type: 'village',
        population: 2600,
        households: 580,
        przOverlapPct: 35.0,
        activeDeformation: false,
        priorityScore: 0.495,
        hazardType: 'Moderate Colluvial Creep',
        soviScore: 0.53,
        tier: 'Tier 2 (Short-Term)',
      },
      {
        id: 805,
        name: 'Joshimath Town Hub',
        type: 'town',
        population: 16700,
        households: 3900,
        przOverlapPct: 15.0,
        activeDeformation: false,
        priorityScore: 0.285,
        hazardType: 'Drainage Overburden Saturation',
        soviScore: 0.42,
        tier: 'Tier 3 (Medium-Term)',
      },
    ],
    candidateSites: [
      { id: 501, name: 'Bhatoli Sandstone Plateau', areaHa: 18.5, ccFinal: 850, bindingConstraint: 'water', suitability: 94, tenure: 'government_revenue' },
      { id: 502, name: 'Gauchar High Terrace', areaHa: 24.0, ccFinal: 1250, bindingConstraint: 'school', suitability: 91, tenure: 'government_revenue' },
    ],
    disasters: [
      {
        date: '2023-01-05',
        hazardType: 'subsidence',
        fatalities: 0,
        injured: 14,
        housesDamaged: 860,
        severity: 0.94,
        source: 'Wadia Institute / Uttarakhand SDMA',
        eventTitle: 'Joshimath Regional Subsidence Crisis 2023',
      },
      {
        date: '2021-02-07',
        hazardType: 'flash_flood',
        fatalities: 204,
        injured: 45,
        housesDamaged: 110,
        severity: 0.98,
        source: 'NDRF Command / SDMA',
        eventTitle: 'Chamoli Glacial Lake Surge & Debris Avalanche 2021',
      },
    ],
  },
  west: {
    key: 'west',
    districtName: 'Kachchh (Kutch)',
    state: 'Gujarat',
    lgdCode: 442,
    adminId: 104,
    censusPopulation: 2092371,
    riverBasin: 'Rann of Kachchh Rift Basin',
    primaryHazard: 'Intraplate Seismic Shear & Coastal Salinity Surge',
    dangerLevel: 'High',
    touristRiskRating: 'Level-3 Caution (Seismic Strain & Salt Flat Surge)',
    peakDangerWindow: 'Pre-Monsoon Arabian Sea Depressions (May – July)',
    touristAdvisory:
      'Visitors to Dhordo White Desert and the Great Rann must monitor tidal creek storm surge warnings. Mainland fault zones near Bhuj and Bhachau require adherence to earthquake-resilient circular Bhunga architectural safety guidelines.',
    safeHavenGuidance:
      'Habo Hill and the Bhuj High Ridge provide elevated Jurassic sandstone bedrock sanctuaried 65m above tidal surge lines and free from soil liquefaction risk.',
    totalHabitationsCount: 5,
    totalHouseholdsAtRisk: 4280,
    totalCandidateSitesCount: 3,
    maxSafeCapacityHouseholds: 2800,
    primaryBindingConstraint: 'Desalinated Potable Water Supply',
    habitations: [
      {
        id: 811,
        name: 'Dhordo Salt Flat Edge',
        type: 'village',
        population: 1450,
        households: 290,
        przOverlapPct: 79.5,
        activeDeformation: true,
        priorityScore: 0.812,
        hazardType: 'Coastal Creek Inundation',
        soviScore: 0.72,
        tier: 'Tier 1 (Immediate)',
      },
      {
        id: 812,
        name: 'Bhuj Mainland Basin',
        type: 'town',
        population: 21300,
        households: 4800,
        przOverlapPct: 38.0,
        activeDeformation: false,
        priorityScore: 0.584,
        hazardType: 'Intraplate Fault Slip',
        soviScore: 0.58,
        tier: 'Tier 2 (Short-Term)',
      },
      {
        id: 813,
        name: 'Bhachau Alluvial Plain',
        type: 'village',
        population: 5800,
        households: 1250,
        przOverlapPct: 62.0,
        activeDeformation: false,
        priorityScore: 0.718,
        hazardType: 'Seismic Soil Liquefaction',
        soviScore: 0.69,
        tier: 'Tier 2 (Short-Term)',
      },
      {
        id: 814,
        name: 'Mandvi Coastal Reach',
        type: 'town',
        population: 14200,
        households: 3100,
        przOverlapPct: 42.0,
        activeDeformation: false,
        priorityScore: 0.495,
        hazardType: 'Arabian Sea Storm Surge',
        soviScore: 0.51,
        tier: 'Tier 3 (Medium-Term)',
      },
      {
        id: 815,
        name: 'Habo Hill Sanctuary',
        type: 'village',
        population: 2100,
        households: 460,
        przOverlapPct: 8.5,
        activeDeformation: false,
        priorityScore: 0.185,
        hazardType: 'Stable Jurassic Bedrock',
        soviScore: 0.38,
        tier: 'Tier 4 (Mitigate In-Situ)',
      },
    ],
    candidateSites: [
      { id: 511, name: 'Habo Hill Bedrock Terrace', areaHa: 22.0, ccFinal: 1400, bindingConstraint: 'water', suitability: 92, tenure: 'government_revenue' },
      { id: 512, name: 'Bhuj North Plateau', areaHa: 19.5, ccFinal: 1400, bindingConstraint: 'school', suitability: 88, tenure: 'government_revenue' },
    ],
    disasters: [
      {
        date: '2023-06-15',
        hazardType: 'cyclone',
        fatalities: 4,
        injured: 38,
        housesDamaged: 1420,
        severity: 0.88,
        source: 'IMD / Gujarat SDMA',
        eventTitle: 'Cyclone Biparjoy Coastal Inundation 2023',
      },
      {
        date: '2001-01-26',
        hazardType: 'earthquake',
        fatalities: 19850,
        injured: 167000,
        housesDamaged: 340000,
        severity: 1.0,
        source: 'GSDMA / National Seismic Network',
        eventTitle: 'Bhuj Intraplate Thrust Earthquake 2001 (Mw 7.7)',
      },
    ],
  },
  central: {
    key: 'central',
    districtName: 'Satpura (Hoshangabad)',
    state: 'Madhya Pradesh',
    lgdCode: 422,
    adminId: 106,
    censusPopulation: 1241350,
    riverBasin: 'Narmada-Tawa River Basin',
    primaryHazard: 'Forest Catchment Flash Surge & Monsoon Inundation',
    dangerLevel: 'Monitored',
    touristRiskRating: 'Level-2 Stable Baseline (Catchment Flash Surge Advisory)',
    peakDangerWindow: 'Late SW Monsoon (August – September)',
    touristAdvisory:
      'Pachmarhi hill station and Satpura Tiger Reserve valleys experience sudden river water surges along Denwa and Tawa tributaries during upstream dam gate operations. Core tourist plateau circuits remain stable, motorable, and safe.',
    safeHavenGuidance:
      'The Pachmarhi High Plateau and Pipariya Ridge represent rock-solid ancient Deccan basalt ground with zero liquefaction and pristine elevation buffer.',
    totalHabitationsCount: 5,
    totalHouseholdsAtRisk: 2150,
    totalCandidateSitesCount: 3,
    maxSafeCapacityHouseholds: 3500,
    primaryBindingConstraint: 'Forest Clearance & Buffer Regulations',
    habitations: [
      {
        id: 821,
        name: 'Pachmarhi Valley Foot',
        type: 'village',
        population: 2300,
        households: 510,
        przOverlapPct: 52.0,
        activeDeformation: false,
        priorityScore: 0.512,
        hazardType: 'Riparian Torrent Surge',
        soviScore: 0.54,
        tier: 'Tier 2 (Short-Term)',
      },
      {
        id: 822,
        name: 'Tawa River Discharge Reach',
        type: 'village',
        population: 3100,
        households: 680,
        przOverlapPct: 61.5,
        activeDeformation: false,
        priorityScore: 0.625,
        hazardType: 'Reservoir Flood Plain Spill',
        soviScore: 0.59,
        tier: 'Tier 2 (Short-Term)',
      },
      {
        id: 823,
        name: 'Pipariya Transit Hub',
        type: 'town',
        population: 18400,
        households: 4100,
        przOverlapPct: 18.0,
        activeDeformation: false,
        priorityScore: 0.215,
        hazardType: 'Highway Drainage Congestion',
        soviScore: 0.39,
        tier: 'Tier 4 (Mitigate In-Situ)',
      },
      {
        id: 824,
        name: 'Sohagpur Lowland Fringe',
        type: 'village',
        population: 4600,
        households: 980,
        przOverlapPct: 32.0,
        activeDeformation: false,
        priorityScore: 0.384,
        hazardType: 'Alluvial Field Inundation',
        soviScore: 0.47,
        tier: 'Tier 3 (Medium-Term)',
      },
      {
        id: 825,
        name: 'Pachmarhi High Plateau',
        type: 'town',
        population: 12100,
        households: 2750,
        przOverlapPct: 6.0,
        activeDeformation: false,
        priorityScore: 0.125,
        hazardType: 'Competent Deccan Basalt Shield',
        soviScore: 0.32,
        tier: 'Tier 4 (Mitigate In-Situ)',
      },
    ],
    candidateSites: [
      { id: 521, name: 'Pachmarhi Basalt Plateau Terrace', areaHa: 28.0, ccFinal: 1800, bindingConstraint: 'water', suitability: 95, tenure: 'government_revenue' },
      { id: 522, name: 'Pipariya High Ridge Parcel', areaHa: 25.0, ccFinal: 1700, bindingConstraint: 'school', suitability: 93, tenure: 'government_revenue' },
    ],
    disasters: [
      {
        date: '2020-08-30',
        hazardType: 'riverine_flood',
        fatalities: 6,
        injured: 22,
        housesDamaged: 740,
        severity: 0.78,
        source: 'MP SDMA / CWC',
        eventTitle: 'Narmada-Tawa Peak Basin Flood 2020',
      },
    ],
  },
};

export const BACKEND_DISTRICT_KEYS: BackendDistrictKey[] = [
  'north',
  'west',
  'central',
  'barpeta',
  'wayanad',
  'kodagu',
];

/**
 * Maps zone IDs or district names from the map interface to backend district profiles.
 */
export function getBackendProfileForZone(zone: string): DistrictBackendProfile {
  const norm = zone.toLowerCase();
  if (norm.includes('joshimath') || norm.includes('chamoli') || norm === 'north') return BACKEND_DISTRICT_PROFILES.north;
  if (norm.includes('kutch') || norm.includes('kachchh') || norm === 'west') return BACKEND_DISTRICT_PROFILES.west;
  if (norm.includes('satpura') || norm.includes('hoshangabad') || norm === 'central') return BACKEND_DISTRICT_PROFILES.central;
  if (norm.includes('barpeta') || norm === 'east') return BACKEND_DISTRICT_PROFILES.barpeta;
  if (norm.includes('kodagu')) return BACKEND_DISTRICT_PROFILES.kodagu;
  if (norm.includes('wayanad') || norm === 'south') return BACKEND_DISTRICT_PROFILES.wayanad;
  return BACKEND_DISTRICT_PROFILES.wayanad;
}

/**
 * Attempts to fetch live data from the backend.
 * Falls back gracefully to verified baseline data if backend is offline or empty.
 */
export async function loadDistrictData(
  districtKey: BackendDistrictKey,
  signal?: AbortSignal,
): Promise<{ profile: DistrictBackendProfile; isLive: boolean }> {
  const baseline = BACKEND_DISTRICT_PROFILES[districtKey];

  try {
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), 1500);

    if (signal) {
      signal.addEventListener('abort', () => timeoutController.abort(), { once: true });
    }

    const habResult = await apiGet<HabitationApiResponse>(
      `/habitations?admin=${baseline.adminId}&limit=100`,
      undefined,
      timeoutController.signal,
    );

    clearTimeout(timeoutId);

    if (habResult && habResult.items && habResult.items.length > 0) {
      const liveHabitations: BackendHabitationRecord[] = habResult.items.map(
        (item: HabitationApiResponseItem) => ({
          id: item.id,
          name: item.name,
          type: item.type ?? 'village',
          population: item.population,
          households: item.households,
          przOverlapPct: item.risk?.prz_overlap_pct,
          activeDeformation: item.risk?.active_deformation,
          priorityScore: item.risk?.priority_score,
          hazardType: item.risk?.hazard_type,
          soviScore: item.risk?.sovi_score,
          tier: item.risk?.tier ?? 'Tier 2 (Short-Term)',
        })
      );

      return {
        profile: {
          ...baseline,
          totalHabitationsCount: habResult.total || liveHabitations.length,
          totalHouseholdsAtRisk: habResult.items.reduce(
            (acc: number, h: HabitationApiResponseItem) => acc + (h.households ?? 0),
            0
          ),
          habitations: liveHabitations,
        },
        isLive: true,
      };
    }
  } catch {
    // Fall back to baseline gracefully
  }

  return { profile: baseline, isLive: false };
}
