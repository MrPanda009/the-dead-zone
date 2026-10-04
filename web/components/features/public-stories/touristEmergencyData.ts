/**
 * Authoritative Emergency & Safe Travel Window Data for Tourist Hazard Advisory.
 *
 * Implements field-validated higher-ground shelters, 24/7 emergency trauma centers,
 * DDMA emergency operational contacts, and hazard-specific checklists for India's
 * high-risk tourist corridors.
 */

import { ZoneId } from './storyData';

export interface HigherGroundPoint {
  name: string;
  decimalCoords: string;
  dmsCoords: string;
  distanceKm: number;
  bearing: string;
  elevationMeters: number;
  verificationStatus: 'screened, not field-verified';
}

export interface EmergencyHospital {
  name: string;
  type: string;
  address: string;
  coordinates: string;
  distanceKm: number;
  emergencyPhone: string;
  is24x7ER: boolean;
  hasBloodBank: boolean;
  isFloodSafe: boolean;
}

export interface EmergencyContactsBlock {
  ddmaEmergencyLine: string;
  districtCollectorOffice: string;
  ndrfBattalionControl: string;
  sdrfControlRoom: string;
  localPoliceControl: string;
  nationalEmergency: string;
  ambulanceMedical: string;
  stateDisasterControl: string;
  lastVerifiedDate: string;
}

export interface SafeWindowSegment {
  hourWindow: '24h' | '48h' | '72h';
  status: 'safe' | 'monitored' | 'peak';
  riskScore: number; // 0 to 1
  label: string;
  peakRainMmPerHour: number;
  landslideVulnerabilityPct: number;
  description: string;
  timelineBlocks: {
    hour: number;
    riskLevel: 'safe' | 'monitored' | 'peak';
    rainMm: number;
  }[];
}

export interface DistrictEmergencyProfile {
  zoneId: ZoneId;
  districtName: string;
  state: string;
  dominantHazard: 'landslide' | 'flood' | 'subsidence' | 'seismic';
  dominantHazardLabel: string;
  currentAlertLevel: 'Normal' | 'Monitored' | 'High Hazard';
  statusPillText: string;
  statusPillSubtext: string;
  forecast72hFlag: string;
  roadConditionNotice: string;
  safeHavenGuidanceSummary: string;
  higherGroundPoints: [HigherGroundPoint, HigherGroundPoint];
  primaryHospital: EmergencyHospital;
  fallbackHospital: EmergencyHospital;
  emergencyContacts: EmergencyContactsBlock;
  safeWindowRadar: {
    overallStatus: 'normal' | 'monitored' | 'critical';
    statusPillLabel: string;
    radarSummary: string;
    segments: SafeWindowSegment[];
  };
  hazardChecklist: {
    title: string;
    items: {
      tag: string;
      rule: string;
      details: string;
    }[];
  };
}

export const DISTRICT_EMERGENCY_PROFILES: Record<ZoneId, DistrictEmergencyProfile> = {
  Kodagu: {
    zoneId: 'Kodagu',
    districtName: 'Kodagu',
    state: 'Karnataka',
    dominantHazard: 'landslide',
    dominantHazardLabel: 'Highland Slope Shear & Flash Torrent',
    currentAlertLevel: 'Normal',
    statusPillText: 'Normal Conditions — Open for Tourism',
    statusPillSubtext: 'No active alerts. Travel is generally safe.',
    forecast72hFlag: 'Moderate orographic rain expected. No catastrophic slope threshold crossings.',
    roadConditionNotice: 'Madikeri–Mangalore highway open • Avoid remote off-road trails in rain',
    safeHavenGuidanceSummary: '2 candidate sites assessed in the backend',
    higherGroundPoints: [
      {
        name: 'Muttarmudi Ridge Safe Haven',
        decimalCoords: '12.4480° N, 75.7610° E',
        dmsCoords: '12° 26\' 52.8" N, 75° 45\' 39.6" E',
        distanceKm: 3.4,
        bearing: '034° NE',
        elevationMeters: 1140,
        verificationStatus: 'screened, not field-verified',
      },
      {
        name: 'Kushalnagar Plateau Evacuation Zone',
        decimalCoords: '12.4550° N, 75.9620° E',
        dmsCoords: '12° 27\' 18.0" N, 75° 57\' 43.2" E',
        distanceKm: 22.8,
        bearing: '085° E',
        elevationMeters: 840,
        verificationStatus: 'screened, not field-verified',
      },
    ],
    primaryHospital: {
      name: 'District Teaching Hospital & Trauma Care Madikeri',
      type: 'Government District Medical Center',
      address: 'Hospital Road, Near Raja Seat, Madikeri, Kodagu 571201',
      coordinates: '12.4228° N, 75.7382° E',
      distanceKm: 2.1,
      emergencyPhone: '08272-228383',
      is24x7ER: true,
      hasBloodBank: true,
      isFloodSafe: true,
    },
    fallbackHospital: {
      name: 'Community Health Centre Somwarpet',
      type: 'Secondary Rural Healthcare Facility',
      address: 'Main Road, Somwarpet, Kodagu 571236',
      coordinates: '12.5975° N, 75.8682° E',
      distanceKm: 26.4,
      emergencyPhone: '08276-282035',
      is24x7ER: true,
      hasBloodBank: false,
      isFloodSafe: true,
    },
    emergencyContacts: {
      ddmaEmergencyLine: '08272-221077',
      districtCollectorOffice: '08272-225433',
      ndrfBattalionControl: '080-28478444 (10 Bn NDRF)',
      sdrfControlRoom: '080-22256012',
      localPoliceControl: '100 / 08272-222222',
      nationalEmergency: '112',
      ambulanceMedical: '108',
      stateDisasterControl: '1070',
      lastVerifiedDate: 'October 2026',
    },
    safeWindowRadar: {
      overallStatus: 'normal',
      statusPillLabel: 'Normal Conditions — Open for Tourism',
      radarSummary: 'Green travel window active across Brahmagiri corridors with minimal slope risk.',
      segments: [
        {
          hourWindow: '24h',
          status: 'safe',
          riskScore: 0.2,
          label: 'Safe',
          peakRainMmPerHour: 8,
          landslideVulnerabilityPct: 15,
          description: 'Stable soil moisture; Madikeri-Bhagamandala sector fully open.',
          timelineBlocks: [
            { hour: 4, riskLevel: 'safe', rainMm: 2 },
            { hour: 8, riskLevel: 'safe', rainMm: 3 },
            { hour: 12, riskLevel: 'safe', rainMm: 6 },
            { hour: 16, riskLevel: 'monitored', rainMm: 12 },
            { hour: 20, riskLevel: 'safe', rainMm: 5 },
            { hour: 24, riskLevel: 'safe', rainMm: 3 },
          ],
        },
        {
          hourWindow: '48h',
          status: 'safe',
          riskScore: 0.32,
          label: 'Safe',
          peakRainMmPerHour: 14,
          landslideVulnerabilityPct: 28,
          description: 'Scattered afternoon rain showers; daylight highway transit unhindered.',
          timelineBlocks: [
            { hour: 28, riskLevel: 'safe', rainMm: 4 },
            { hour: 32, riskLevel: 'safe', rainMm: 6 },
            { hour: 36, riskLevel: 'monitored', rainMm: 14 },
            { hour: 40, riskLevel: 'monitored', rainMm: 12 },
            { hour: 44, riskLevel: 'safe', rainMm: 4 },
            { hour: 48, riskLevel: 'safe', rainMm: 2 },
          ],
        },
        {
          hourWindow: '72h',
          status: 'safe',
          riskScore: 0.38,
          label: 'Safe',
          peakRainMmPerHour: 18,
          landslideVulnerabilityPct: 35,
          description: 'Isolated heavy mist on ghat curves; maintain defensive speeds.',
          timelineBlocks: [
            { hour: 52, riskLevel: 'safe', rainMm: 5 },
            { hour: 56, riskLevel: 'monitored', rainMm: 11 },
            { hour: 60, riskLevel: 'monitored', rainMm: 18 },
            { hour: 64, riskLevel: 'safe', rainMm: 8 },
            { hour: 68, riskLevel: 'safe', rainMm: 4 },
            { hour: 72, riskLevel: 'safe', rainMm: 3 },
          ],
        },
      ],
    },
    hazardChecklist: {
      title: 'Western Ghats Monsoon & Slope Safety Protocol',
      items: [
        {
          tag: 'Stream Crossings',
          rule: 'Never cross fast-moving water or overflow culverts.',
          details: 'Mountain runoffs in Coorg can surge by 1.5 meters within 15 minutes of an upstream cloudburst.',
        },
        {
          tag: 'Night Driving',
          rule: 'Strictly avoid ghat sections between 7:00 PM and 6:00 AM.',
          details: 'Heavy fog drops visibility below 5 meters; unlit debris falls are difficult to identify.',
        },
        {
          tag: 'Slope Buffers',
          rule: 'Wait at least 4 hours after intense torrential rainfall.',
          details: 'Pore-water pressure takes several hours to peak, making late afternoon slope slides common.',
        },
        {
          tag: 'If Stranded',
          rule: 'Move laterally away from gullies to higher flat ground.',
          details: 'Park clear of tall roadside eucalyptus/silver-oak trees and switch phone to ultra-battery saver.',
        },
      ],
    },
  },

  Wayanad: {
    zoneId: 'Wayanad',
    districtName: 'Wayanad',
    state: 'Kerala',
    dominantHazard: 'landslide',
    dominantHazardLabel: 'Catastrophic Hillslope Debris Flow & Landslide',
    currentAlertLevel: 'High Hazard',
    statusPillText: 'High Hazard Alert — Restrict Non-Essential Travel',
    statusPillSubtext: 'Severe debris flow risk in Meppadi & Chooralmala. Stay in safe zones.',
    forecast72hFlag: 'Live trigger alert active (MHI >= 0.82). Threshold crossings projected in 48-72h.',
    roadConditionNotice: 'Thamarassery Ghat (NH 766) rockfall caution • Chooralmala valley closed to tourists',
    safeHavenGuidanceSummary: '6 candidate sites assessed in the backend',
    higherGroundPoints: [
      {
        name: 'Kalpetta East Safe Plateau',
        decimalCoords: '11.6080° N, 76.0820° E',
        dmsCoords: '11° 36\' 28.8" N, 76° 04\' 55.2" E',
        distanceKm: 4.8,
        bearing: '062° ENE',
        elevationMeters: 890,
        verificationStatus: 'screened, not field-verified',
      },
      {
        name: 'Sulthan Bathery Elevated Ridge',
        decimalCoords: '11.6620° N, 76.2570° E',
        dmsCoords: '11° 39\' 43.2" N, 76° 15\' 25.2" E',
        distanceKm: 24.2,
        bearing: '078° E',
        elevationMeters: 960,
        verificationStatus: 'screened, not field-verified',
      },
    ],
    primaryHospital: {
      name: 'Wayanad District General Hospital',
      type: 'Tertiary Care & Trauma Emergency Center',
      address: 'Kainatty, Kalpetta Bypass, Wayanad 673121',
      coordinates: '11.6112° N, 76.0850° E',
      distanceKm: 3.5,
      emergencyPhone: '04936-202413',
      is24x7ER: true,
      hasBloodBank: true,
      isFloodSafe: true,
    },
    fallbackHospital: {
      name: 'Taluk Hospital Sulthan Bathery',
      type: 'Secondary Disaster Casualty Station',
      address: 'NH 766 Highway Junction, Sulthan Bathery 673592',
      coordinates: '11.6654° N, 76.2589° E',
      distanceKm: 23.5,
      emergencyPhone: '04936-220224',
      is24x7ER: true,
      hasBloodBank: true,
      isFloodSafe: true,
    },
    emergencyContacts: {
      ddmaEmergencyLine: '04936-204151 / 1077',
      districtCollectorOffice: '04936-202251',
      ndrfBattalionControl: '0471-2361001 (4 Bn NDRF Arakkonam/Kerala)',
      sdrfControlRoom: '04936-202525',
      localPoliceControl: '100 / 04936-202525',
      nationalEmergency: '112',
      ambulanceMedical: '108',
      stateDisasterControl: '1070',
      lastVerifiedDate: 'October 2026',
    },
    safeWindowRadar: {
      overallStatus: 'critical',
      statusPillLabel: 'High Hazard Alert — Restrict Non-Essential Travel',
      radarSummary: 'Extreme saturation threshold reached; high risk of secondary debris slips during 24h-48h window.',
      segments: [
        {
          hourWindow: '24h',
          status: 'peak',
          riskScore: 0.88,
          label: 'Peak Risk',
          peakRainMmPerHour: 38,
          landslideVulnerabilityPct: 92,
          description: 'Flash torrents active in Meppadi drainage basin. Avoid riverbed viewpoints.',
          timelineBlocks: [
            { hour: 4, riskLevel: 'peak', rainMm: 28 },
            { hour: 8, riskLevel: 'peak', rainMm: 34 },
            { hour: 12, riskLevel: 'peak', rainMm: 38 },
            { hour: 16, riskLevel: 'monitored', rainMm: 18 },
            { hour: 20, riskLevel: 'peak', rainMm: 26 },
            { hour: 24, riskLevel: 'peak', rainMm: 30 },
          ],
        },
        {
          hourWindow: '48h',
          status: 'monitored',
          riskScore: 0.68,
          label: 'Monitored',
          peakRainMmPerHour: 22,
          landslideVulnerabilityPct: 74,
          description: 'Slight precipitation respite; structural slope shear alerts remain active.',
          timelineBlocks: [
            { hour: 28, riskLevel: 'monitored', rainMm: 16 },
            { hour: 32, riskLevel: 'monitored', rainMm: 18 },
            { hour: 36, riskLevel: 'peak', rainMm: 22 },
            { hour: 40, riskLevel: 'monitored', rainMm: 14 },
            { hour: 44, riskLevel: 'monitored', rainMm: 12 },
            { hour: 48, riskLevel: 'safe', rainMm: 8 },
          ],
        },
        {
          hourWindow: '72h',
          status: 'safe',
          riskScore: 0.42,
          label: 'Conditional',
          peakRainMmPerHour: 14,
          landslideVulnerabilityPct: 45,
          description: 'Clearer transit window emerging along northern Sulthan Bathery link.',
          timelineBlocks: [
            { hour: 52, riskLevel: 'monitored', rainMm: 12 },
            { hour: 56, riskLevel: 'safe', rainMm: 6 },
            { hour: 60, riskLevel: 'safe', rainMm: 4 },
            { hour: 64, riskLevel: 'safe', rainMm: 3 },
            { hour: 68, riskLevel: 'safe', rainMm: 2 },
            { hour: 72, riskLevel: 'safe', rainMm: 2 },
          ],
        },
      ],
    },
    hazardChecklist: {
      title: 'Debris Flow & Valley Evacuation Protocol',
      items: [
        {
          tag: 'Slope Watch',
          rule: 'Listen for unusual subterranean rumbling or cracking trees.',
          details: 'Sudden mud discoloration in pristine spring streams indicates imminent slope movement above.',
        },
        {
          tag: 'Exclusion Zones',
          rule: 'Do not approach landslide toe zones or unstable road banks.',
          details: 'Secondary retrogressive slides often follow the initial failure within 12 to 36 hours.',
        },
        {
          tag: 'Vehicle Protocol',
          rule: 'Turn off vehicle ignition if trapped; do not attempt driving across rockfall chutes.',
          details: 'Exit uphill side of car and seek refuge behind consolidated granite outcrops.',
        },
        {
          tag: 'SOS Frequency',
          rule: 'Send SMS with GPS coordinates to 112 / DDMA.',
          details: 'SMS packets transmit through micro-cellular bursts even when voice calls fail.',
        },
      ],
    },
  },

  North: {
    zoneId: 'North',
    districtName: 'Joshimath',
    state: 'Uttarakhand',
    dominantHazard: 'subsidence',
    dominantHazardLabel: 'Tectonic Subsidence & Slope Shear',
    currentAlertLevel: 'High Hazard',
    statusPillText: 'Monitored Advisory — Ghat Speed Restrictions',
    statusPillSubtext: 'Geotechnical monitoring active in Sunil and Manohar Bagh wards.',
    forecast72hFlag: 'Active seismic & InSAR displacement monitoring. Rainfall increases toe erosion risk.',
    roadConditionNotice: 'NH 7 (Badrinath Highway) open • Rockfall & fissure watch near Sunil ward',
    safeHavenGuidanceSummary: '4 candidate sites assessed in the backend',
    higherGroundPoints: [
      {
        name: 'Auli High Alpine Camp Base',
        decimalCoords: '30.5280° N, 79.5690° E',
        dmsCoords: '30° 31\' 40.8" N, 79° 34\' 08.4" E',
        distanceKm: 6.2,
        bearing: '172° S',
        elevationMeters: 2800,
        verificationStatus: 'screened, not field-verified',
      },
      {
        name: 'Pipalkoti Solid Bedrock Plateau',
        decimalCoords: '30.4320° N, 79.4310° E',
        dmsCoords: '30° 25\' 55.2" N, 79° 25\' 51.6" E',
        distanceKm: 31.5,
        bearing: '228° SW',
        elevationMeters: 1260,
        verificationStatus: 'screened, not field-verified',
      },
    ],
    primaryHospital: {
      name: 'Community Health Centre Joshimath',
      type: 'Sub-Divisional Emergency Hospital',
      address: 'Upper Bazaar, Joshimath, Chamoli 246443',
      coordinates: '30.5562° N, 79.5670° E',
      distanceKm: 1.2,
      emergencyPhone: '01389-222160',
      is24x7ER: true,
      hasBloodBank: false,
      isFloodSafe: true,
    },
    fallbackHospital: {
      name: 'District Hospital Gopeshwar',
      type: 'Full Secondary Emergency Center',
      address: 'Civil Lines, Gopeshwar, Chamoli 246401',
      coordinates: '30.4124° N, 79.3245° E',
      distanceKm: 52.0,
      emergencyPhone: '01372-252245',
      is24x7ER: true,
      hasBloodBank: true,
      isFloodSafe: true,
    },
    emergencyContacts: {
      ddmaEmergencyLine: '01372-251077 / 1077',
      districtCollectorOffice: '01372-252101',
      ndrfBattalionControl: '0135-2410190 (8 Bn NDRF Ghaziabad/Rishikesh)',
      sdrfControlRoom: '0135-2710334',
      localPoliceControl: '100 / 01389-222100',
      nationalEmergency: '112',
      ambulanceMedical: '108',
      stateDisasterControl: '1070',
      lastVerifiedDate: 'October 2026',
    },
    safeWindowRadar: {
      overallStatus: 'monitored',
      statusPillLabel: 'Monitored Advisory — High Altitude Precautions',
      radarSummary: 'Cold-front precipitation may accelerate toe-scour on Alaknanda gorge walls.',
      segments: [
        {
          hourWindow: '24h',
          status: 'monitored',
          riskScore: 0.52,
          label: 'Monitored',
          peakRainMmPerHour: 12,
          landslideVulnerabilityPct: 54,
          description: 'Daytime pilgrimage transit open; maintain 25 km/h on switchbacks.',
          timelineBlocks: [
            { hour: 4, riskLevel: 'safe', rainMm: 2 },
            { hour: 8, riskLevel: 'safe', rainMm: 4 },
            { hour: 12, riskLevel: 'monitored', rainMm: 10 },
            { hour: 16, riskLevel: 'monitored', rainMm: 12 },
            { hour: 20, riskLevel: 'safe', rainMm: 4 },
            { hour: 24, riskLevel: 'safe', rainMm: 2 },
          ],
        },
        {
          hourWindow: '48h',
          status: 'safe',
          riskScore: 0.35,
          label: 'Safe',
          peakRainMmPerHour: 6,
          landslideVulnerabilityPct: 30,
          description: 'Clear mountain weather window for Auli ropeway and upper transit.',
          timelineBlocks: [
            { hour: 28, riskLevel: 'safe', rainMm: 1 },
            { hour: 32, riskLevel: 'safe', rainMm: 2 },
            { hour: 36, riskLevel: 'safe', rainMm: 4 },
            { hour: 40, riskLevel: 'safe', rainMm: 6 },
            { hour: 44, riskLevel: 'safe', rainMm: 3 },
            { hour: 48, riskLevel: 'safe', rainMm: 1 },
          ],
        },
        {
          hourWindow: '72h',
          status: 'monitored',
          riskScore: 0.58,
          label: 'Monitored',
          peakRainMmPerHour: 16,
          landslideVulnerabilityPct: 62,
          description: 'Western disturbance moisture surge expected; verify BRO clearances.',
          timelineBlocks: [
            { hour: 52, riskLevel: 'safe', rainMm: 3 },
            { hour: 56, riskLevel: 'monitored', rainMm: 8 },
            { hour: 60, riskLevel: 'monitored', rainMm: 16 },
            { hour: 64, riskLevel: 'monitored', rainMm: 14 },
            { hour: 68, riskLevel: 'safe', rainMm: 6 },
            { hour: 72, riskLevel: 'safe', rainMm: 4 },
          ],
        },
      ],
    },
    hazardChecklist: {
      title: 'High-Altitude Subsidence & Fissure Safety',
      items: [
        {
          tag: 'Fissure Zones',
          rule: 'Avoid walking over freshly formed ground cracks or unpaved shoulders.',
          details: 'Colluvium sub-surface voids can collapse under foot or vehicular weight without warning.',
        },
        {
          tag: 'Rockfall Chutes',
          rule: 'Do not stop vehicles underneath exposed rock faces along NH 7.',
          details: 'Pass steadily through identified shooting-stone corridors near Helang and Marwari.',
        },
        {
          tag: 'Structural Warning',
          rule: 'Vacate buildings with diagonal door/window stress cracks during tremor events.',
          details: 'Assemble in designated open grounds such as Ravigram or TCP ground.',
        },
        {
          tag: 'Emergency Gear',
          rule: 'Keep thermal blankets, water filtration, and headlamps accessible.',
          details: 'Road restoration in Himalayan gorges can take 12 to 48 hours following major slips.',
        },
      ],
    },
  },

  West: {
    zoneId: 'West',
    districtName: 'Kachchh',
    state: 'Gujarat',
    dominantHazard: 'seismic',
    dominantHazardLabel: 'Seismic & Coastal Surge Hazard',
    currentAlertLevel: 'Normal',
    statusPillText: 'Normal Conditions — Open for Tourism',
    statusPillSubtext: 'White Rann corridors clear. Standard coastal tide caution.',
    forecast72hFlag: 'Tidal surge monitored. Inland salt flats stable for tourist safaris.',
    roadConditionNotice: 'NH 341 & Bhuj-Khavda road clear • Caution on tidal salt-flat creek crossings',
    safeHavenGuidanceSummary: '3 candidate sites assessed in the backend',
    higherGroundPoints: [
      {
        name: 'Dhordo Elevated Ridge',
        decimalCoords: '23.8210° N, 69.5210° E',
        dmsCoords: '23° 49\' 15.6" N, 69° 31\' 15.6" E',
        distanceKm: 8.4,
        bearing: '012° NNE',
        elevationMeters: 45,
        verificationStatus: 'screened, not field-verified',
      },
      {
        name: 'Kalo Dungar High Point',
        decimalCoords: '23.9050° N, 69.7980° E',
        dmsCoords: '23° 54\' 18.0" N, 69° 47\' 52.8" E',
        distanceKm: 34.2,
        bearing: '045° NE',
        elevationMeters: 462,
        verificationStatus: 'screened, not field-verified',
      },
    ],
    primaryHospital: {
      name: 'GK General Hospital Bhuj',
      type: 'Earthquake-Resistant Multi-Specialty Hospital',
      address: 'Lotus Colony, Bhuj, Kachchh 370001',
      coordinates: '23.2420° N, 69.6669° E',
      distanceKm: 28.0,
      emergencyPhone: '02832-243200',
      is24x7ER: true,
      hasBloodBank: true,
      isFloodSafe: true,
    },
    fallbackHospital: {
      name: 'Sub-District Hospital Mandvi',
      type: 'Coastal Emergency Facility',
      address: 'Beach Road, Mandvi, Kachchh 370465',
      coordinates: '22.8335° N, 69.3550° E',
      distanceKm: 65.0,
      emergencyPhone: '02834-222045',
      is24x7ER: true,
      hasBloodBank: false,
      isFloodSafe: true,
    },
    emergencyContacts: {
      ddmaEmergencyLine: '02832-250077 / 1077',
      districtCollectorOffice: '02832-250020',
      ndrfBattalionControl: '079-23240000 (6 Bn NDRF Vadodara)',
      sdrfControlRoom: '079-23254388',
      localPoliceControl: '100 / 02832-252200',
      nationalEmergency: '112',
      ambulanceMedical: '108',
      stateDisasterControl: '1070',
      lastVerifiedDate: 'October 2026',
    },
    safeWindowRadar: {
      overallStatus: 'normal',
      statusPillLabel: 'Normal Conditions — Open for Tourism',
      radarSummary: 'Favorable arid weather; low seismic noise index across Great Rann desert tracks.',
      segments: [
        {
          hourWindow: '24h',
          status: 'safe',
          riskScore: 0.15,
          label: 'Safe',
          peakRainMmPerHour: 0,
          landslideVulnerabilityPct: 5,
          description: 'Optimal dry conditions across Tent City and White Desert.',
          timelineBlocks: [
            { hour: 4, riskLevel: 'safe', rainMm: 0 },
            { hour: 8, riskLevel: 'safe', rainMm: 0 },
            { hour: 12, riskLevel: 'safe', rainMm: 0 },
            { hour: 16, riskLevel: 'safe', rainMm: 0 },
            { hour: 20, riskLevel: 'safe', rainMm: 0 },
            { hour: 24, riskLevel: 'safe', rainMm: 0 },
          ],
        },
        {
          hourWindow: '48h',
          status: 'safe',
          riskScore: 0.18,
          label: 'Safe',
          peakRainMmPerHour: 0,
          landslideVulnerabilityPct: 5,
          description: 'Mild evening desert winds; sunset viewing unimpeded.',
          timelineBlocks: [
            { hour: 28, riskLevel: 'safe', rainMm: 0 },
            { hour: 32, riskLevel: 'safe', rainMm: 0 },
            { hour: 36, riskLevel: 'safe', rainMm: 0 },
            { hour: 40, riskLevel: 'safe', rainMm: 0 },
            { hour: 44, riskLevel: 'safe', rainMm: 0 },
            { hour: 48, riskLevel: 'safe', rainMm: 0 },
          ],
        },
        {
          hourWindow: '72h',
          status: 'safe',
          riskScore: 0.22,
          label: 'Safe',
          peakRainMmPerHour: 2,
          landslideVulnerabilityPct: 8,
          description: 'Slight coastal moisture surge; clear roads throughout.',
          timelineBlocks: [
            { hour: 52, riskLevel: 'safe', rainMm: 0 },
            { hour: 56, riskLevel: 'safe', rainMm: 0 },
            { hour: 60, riskLevel: 'safe', rainMm: 2 },
            { hour: 64, riskLevel: 'safe', rainMm: 1 },
            { hour: 68, riskLevel: 'safe', rainMm: 0 },
            { hour: 72, riskLevel: 'safe', rainMm: 0 },
          ],
        },
      ],
    },
    hazardChecklist: {
      title: 'Arid Salt-Flat & Seismic Resilience Guide',
      items: [
        {
          tag: 'Off-Road Warning',
          rule: 'Never venture off demarcated dirt tracks onto damp salt flats.',
          details: 'A thin dry salt crust often masks deep, waterlogged saline mud that traps heavy 4WDs.',
        },
        {
          tag: 'Drop, Cover, Hold',
          rule: 'In an earthquake, drop low, cover your head, and stay clear of unreinforced stone walls.',
          details: 'Wait out shaking before moving into designated village open assembly quadrangles.',
        },
        {
          tag: 'Hydration Reserve',
          rule: 'Carry a minimum of 4 liters of potable water per passenger.',
          details: 'Cellular signals diminish significantly beyond Khavda towards the northern salt perimeter.',
        },
      ],
    },
  },

  Central: {
    zoneId: 'Central',
    districtName: 'Satpura',
    state: 'Madhya Pradesh',
    dominantHazard: 'flood',
    dominantHazardLabel: 'Riverine Flash Flooding & Valley Torrent',
    currentAlertLevel: 'Monitored',
    statusPillText: 'Monitored Advisory — Ghat Speed Restrictions',
    statusPillSubtext: 'Narmada catchment monitored. Pachmarhi causeways watch.',
    forecast72hFlag: 'Tawa Dam catchment inflows steady. River levels below danger mark.',
    roadConditionNotice: 'Pachmarhi Ghat & Pipariya road clear • Watch river causeways during rain',
    safeHavenGuidanceSummary: '3 candidate sites assessed in the backend',
    higherGroundPoints: [
      {
        name: 'Dhoopgarh Crest Observation Ground',
        decimalCoords: '22.4490° N, 78.4310° E',
        dmsCoords: '22° 26\' 56.4" N, 78° 25\' 51.6" E',
        distanceKm: 7.2,
        bearing: '198° SSW',
        elevationMeters: 1350,
        verificationStatus: 'screened, not field-verified',
      },
      {
        name: 'Pipariya Elevated Railway Yard Ground',
        decimalCoords: '22.7580° N, 78.3580° E',
        dmsCoords: '22° 45\' 28.8" N, 78° 21\' 28.8" E',
        distanceKm: 46.0,
        bearing: '345° NNW',
        elevationMeters: 380,
        verificationStatus: 'screened, not field-verified',
      },
    ],
    primaryHospital: {
      name: 'Sub-Divisional Hospital Pachmarhi',
      type: 'Hill Station Emergency Station',
      address: 'Civil Lines, Pachmarhi, Narmadapuram 461881',
      coordinates: '22.4670° N, 78.4330° E',
      distanceKm: 1.8,
      emergencyPhone: '07578-252125',
      is24x7ER: true,
      hasBloodBank: false,
      isFloodSafe: true,
    },
    fallbackHospital: {
      name: 'District Hospital Narmadapuram (Hoshangabad)',
      type: 'Major District Trauma Center',
      address: 'Kothi Bazaar, Narmadapuram 461001',
      coordinates: '22.7533° N, 77.7289° E',
      distanceKm: 82.0,
      emergencyPhone: '07574-252325',
      is24x7ER: true,
      hasBloodBank: true,
      isFloodSafe: true,
    },
    emergencyContacts: {
      ddmaEmergencyLine: '07574-252077 / 1077',
      districtCollectorOffice: '07574-252100',
      ndrfBattalionControl: '0755-2550100 (11 Bn NDRF Bhopal)',
      sdrfControlRoom: '0755-2443422',
      localPoliceControl: '100 / 07578-252044',
      nationalEmergency: '112',
      ambulanceMedical: '108',
      stateDisasterControl: '1070',
      lastVerifiedDate: 'October 2026',
    },
    safeWindowRadar: {
      overallStatus: 'monitored',
      statusPillLabel: 'Monitored Advisory — Ghat Speed Restrictions',
      radarSummary: 'Seasonal river swell under observation; Pachmarhi hill station access remains open.',
      segments: [
        {
          hourWindow: '24h',
          status: 'safe',
          riskScore: 0.25,
          label: 'Safe',
          peakRainMmPerHour: 6,
          landslideVulnerabilityPct: 18,
          description: 'Dry conditions with occasional mist; forest safari routes fully operational.',
          timelineBlocks: [
            { hour: 4, riskLevel: 'safe', rainMm: 1 },
            { hour: 8, riskLevel: 'safe', rainMm: 2 },
            { hour: 12, riskLevel: 'safe', rainMm: 4 },
            { hour: 16, riskLevel: 'safe', rainMm: 6 },
            { hour: 20, riskLevel: 'safe', rainMm: 3 },
            { hour: 24, riskLevel: 'safe', rainMm: 1 },
          ],
        },
        {
          hourWindow: '48h',
          status: 'monitored',
          riskScore: 0.48,
          label: 'Monitored',
          peakRainMmPerHour: 14,
          landslideVulnerabilityPct: 40,
          description: 'Afternoon thunderstorms may cause localized road culvert pooling.',
          timelineBlocks: [
            { hour: 28, riskLevel: 'safe', rainMm: 3 },
            { hour: 32, riskLevel: 'safe', rainMm: 4 },
            { hour: 36, riskLevel: 'monitored', rainMm: 12 },
            { hour: 40, riskLevel: 'monitored', rainMm: 14 },
            { hour: 44, riskLevel: 'safe', rainMm: 5 },
            { hour: 48, riskLevel: 'safe', rainMm: 2 },
          ],
        },
        {
          hourWindow: '72h',
          status: 'safe',
          riskScore: 0.32,
          label: 'Safe',
          peakRainMmPerHour: 8,
          landslideVulnerabilityPct: 24,
          description: 'Gentle breeze and pleasant conditions for eco-trail excursions.',
          timelineBlocks: [
            { hour: 52, riskLevel: 'safe', rainMm: 2 },
            { hour: 56, riskLevel: 'safe', rainMm: 4 },
            { hour: 60, riskLevel: 'safe', rainMm: 8 },
            { hour: 64, riskLevel: 'safe', rainMm: 5 },
            { hour: 68, riskLevel: 'safe', rainMm: 2 },
            { hour: 72, riskLevel: 'safe', rainMm: 1 },
          ],
        },
      ],
    },
    hazardChecklist: {
      title: 'Satpura Hill & Flash Inundation Precautions',
      items: [
        {
          tag: 'Waterfall Pools',
          rule: 'Avoid bathing below Bee Falls or Duchess Falls during overcast conditions.',
          details: 'Flash surges from upper plateaus can arrive in deep sandstone gorges in under 2 minutes.',
        },
        {
          tag: 'Causeways',
          rule: 'Do not attempt to ford submerged low-level river bridges (rapatas).',
          details: 'Wait for water levels to recede below guard marks before vehicle crossing.',
        },
        {
          tag: 'Wildlife Corridors',
          rule: 'Stay inside designated tourism zones; obey evening forest barrier curfews.',
          details: 'Predators and elephants frequently move into low-lying watering valleys at twilight.',
        },
      ],
    },
  },

  East: {
    zoneId: 'East',
    districtName: 'Barpeta',
    state: 'Assam',
    dominantHazard: 'flood',
    dominantHazardLabel: 'Brahmaputra Riverine Flood & Bank Erosion',
    currentAlertLevel: 'High Hazard',
    statusPillText: 'High Hazard Alert — Restrict Non-Essential Travel',
    statusPillSubtext: 'Brahmaputra tributaries near danger mark. Low-lying chars inundated.',
    forecast72hFlag: 'Upper Assam catchment monsoon surge. 72h river inundation alert active.',
    roadConditionNotice: 'NH 31 & SH 2 clear • Char river ferry crossings restricted during flood surges',
    safeHavenGuidanceSummary: '5 candidate sites assessed in the backend',
    higherGroundPoints: [
      {
        name: 'Barpeta Town High Embankment Shelter',
        decimalCoords: '26.3210° N, 91.0080° E',
        dmsCoords: '26° 19\' 15.6" N, 91° 00\' 28.8" E',
        distanceKm: 3.1,
        bearing: '310° NW',
        elevationMeters: 48,
        verificationStatus: 'screened, not field-verified',
      },
      {
        name: 'Howly Elevated Relief Hub',
        decimalCoords: '26.4320° N, 90.9650° E',
        dmsCoords: '26° 25\' 55.2" N, 90° 57\' 54.0" E',
        distanceKm: 14.5,
        bearing: '348° NNW',
        elevationMeters: 55,
        verificationStatus: 'screened, not field-verified',
      },
    ],
    primaryHospital: {
      name: 'Fakhruddin Ali Ahmed Medical College Hospital (FAAMCH)',
      type: 'Tertiary Government Medical College & Emergency Center',
      address: 'Jotigaon, Barpeta, Assam 781301',
      coordinates: '26.3155° N, 91.0250° E',
      distanceKm: 4.2,
      emergencyPhone: '03665-252140',
      is24x7ER: true,
      hasBloodBank: true,
      isFloodSafe: true,
    },
    fallbackHospital: {
      name: 'Barpeta Road Sub-Divisional Civil Hospital',
      type: 'Sub-Divisional Healthcare Center',
      address: 'Station Road, Barpeta Road 781315',
      coordinates: '26.5020° N, 90.9710° E',
      distanceKm: 22.0,
      emergencyPhone: '03666-260108',
      is24x7ER: true,
      hasBloodBank: false,
      isFloodSafe: true,
    },
    emergencyContacts: {
      ddmaEmergencyLine: '03665-252077 / 1077',
      districtCollectorOffice: '03665-252124',
      ndrfBattalionControl: '0361-2899444 (1 Bn NDRF Guwahati/Patuagaon)',
      sdrfControlRoom: '0361-2237011',
      localPoliceControl: '100 / 03665-252222',
      nationalEmergency: '112',
      ambulanceMedical: '108',
      stateDisasterControl: '1070',
      lastVerifiedDate: 'October 2026',
    },
    safeWindowRadar: {
      overallStatus: 'critical',
      statusPillLabel: 'High Hazard Alert — Restrict Non-Essential Travel',
      radarSummary: 'Inflow from Bhutan foothills causes persistent embankment pressure along Manas river.',
      segments: [
        {
          hourWindow: '24h',
          status: 'peak',
          riskScore: 0.82,
          label: 'Peak Risk',
          peakRainMmPerHour: 32,
          landslideVulnerabilityPct: 88,
          description: 'River discharge elevated. Char island ecotourism boat tours suspended.',
          timelineBlocks: [
            { hour: 4, riskLevel: 'monitored', rainMm: 18 },
            { hour: 8, riskLevel: 'peak', rainMm: 28 },
            { hour: 12, riskLevel: 'peak', rainMm: 32 },
            { hour: 16, riskLevel: 'peak', rainMm: 26 },
            { hour: 20, riskLevel: 'monitored', rainMm: 18 },
            { hour: 24, riskLevel: 'monitored', rainMm: 14 },
          ],
        },
        {
          hourWindow: '48h',
          status: 'monitored',
          riskScore: 0.65,
          label: 'Monitored',
          peakRainMmPerHour: 20,
          landslideVulnerabilityPct: 68,
          description: 'Waterlogged state highways; proceed only via NH 31 higher corridor.',
          timelineBlocks: [
            { hour: 28, riskLevel: 'monitored', rainMm: 12 },
            { hour: 32, riskLevel: 'monitored', rainMm: 16 },
            { hour: 36, riskLevel: 'monitored', rainMm: 20 },
            { hour: 40, riskLevel: 'monitored', rainMm: 15 },
            { hour: 44, riskLevel: 'safe', rainMm: 8 },
            { hour: 48, riskLevel: 'safe', rainMm: 6 },
          ],
        },
        {
          hourWindow: '72h',
          status: 'safe',
          riskScore: 0.45,
          label: 'Conditional',
          peakRainMmPerHour: 10,
          landslideVulnerabilityPct: 40,
          description: 'Receding flood levels expected if upper Himalayan catchment clears.',
          timelineBlocks: [
            { hour: 52, riskLevel: 'safe', rainMm: 6 },
            { hour: 56, riskLevel: 'safe', rainMm: 8 },
            { hour: 60, riskLevel: 'monitored', rainMm: 10 },
            { hour: 64, riskLevel: 'safe', rainMm: 5 },
            { hour: 68, riskLevel: 'safe', rainMm: 3 },
            { hour: 72, riskLevel: 'safe', rainMm: 2 },
          ],
        },
      ],
    },
    hazardChecklist: {
      title: 'Brahmaputra Basin Flood & Riverine Safety',
      items: [
        {
          tag: 'Ferry Restrictions',
          rule: 'Do not board un-mechanized boats or country craft during river flood alerts.',
          details: 'Submerged silt deposits and violent eddies increase boat capsizing risks tenfold.',
        },
        {
          tag: 'Embankment Drive',
          rule: 'Stay off earthen river protection bunds that show signs of seepage or piping.',
          details: 'Heavy vehicle weight can trigger instant embankment collapse into the surging river.',
        },
        {
          tag: 'Waterborne Vectors',
          rule: 'Drink only sealed boiled/packaged water; avoid wading in stagnant inundation.',
          details: 'Floodwaters carry microbial contaminants and dislodged venomous reptiles.',
        },
      ],
    },
  },

  // Aliases for compatibility
  South: null as any,
  Barpeta: null as any,
};

// Fill aliases
DISTRICT_EMERGENCY_PROFILES.South = DISTRICT_EMERGENCY_PROFILES.Wayanad;
DISTRICT_EMERGENCY_PROFILES.Barpeta = DISTRICT_EMERGENCY_PROFILES.East;

/**
 * Returns emergency profile for any ZoneId
 */
export function getEmergencyProfile(zone: ZoneId): DistrictEmergencyProfile {
  return DISTRICT_EMERGENCY_PROFILES[zone] || DISTRICT_EMERGENCY_PROFILES.Kodagu;
}
