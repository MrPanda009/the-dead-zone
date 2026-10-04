import { SNAPSHOT_LABEL } from '@/lib/stats/copy';

import type { DatasetProvenanceItem } from './types';

const NOT_INGESTED = 'Not ingested';

/**
 * Datasets behind the Stats dashboard.
 *
 * `integrated` means the data is loaded into our database and served by our API. It is not a
 * claim about live feeds. Ingest dates are not recorded in the database, so integrated rows
 * show a neutral "Snapshot" instead of an invented date.
 */
export const DATASET_PROVENANCE_ROWS: DatasetProvenanceItem[] = [
  {
    id: 'mha-losses',
    dataset: 'MHA Disaster Losses (Rajya Sabha)',
    ministry: 'MHA',
    years: '2014-15 to 2022-23',
    granularity: 'State',
    freshness: SNAPSHOT_LABEL,
    limitations: 'Mixed hazards, lives only',
    integrated: true,
    icon: 'account_balance',
    sourceUrl: 'https://mha.gov.in',
  },
  {
    id: 'ncrb-nature',
    dataset: 'NCRB - Forces of Nature',
    ministry: 'MHA (NCRB)',
    years: '2014–2022',
    granularity: 'State',
    freshness: SNAPSHOT_LABEL,
    limitations: 'No injured/missing, aggregate only',
    integrated: true,
    icon: 'analytics',
    sourceUrl: 'https://ncrb.gov.in',
  },
  {
    id: 'cwc-flood',
    dataset: 'CWC Flood Damages',
    ministry: 'MoWR, CWC',
    years: '2016–2022',
    granularity: 'State',
    freshness: SNAPSHOT_LABEL,
    limitations: 'Inconsistent years, partial coverage',
    integrated: true,
    icon: 'water_damage',
    sourceUrl: 'http://cwc.gov.in',
  },
  {
    id: 'morth-highways',
    dataset: 'Damaged National Highways',
    ministry: 'MoRTH',
    years: '2024–25',
    granularity: 'State',
    freshness: SNAPSHOT_LABEL,
    limitations: 'Mixed hazards (rain + landslide + flood)',
    integrated: true,
    icon: 'alt_route',
    sourceUrl: 'https://morth.nic.in',
  },
  {
    id: 'setu-flood-layer',
    dataset: 'SETU-DRR flood susceptibility (computed)',
    ministry: 'Computed in this project',
    years: 'One monsoon season per district',
    granularity: 'H3 res-8 cell',
    freshness: 'See model version on each district',
    limitations:
      'Empirical susceptibility, not a forecast or depth. Not independently validated. Cells without satellite coverage are unmeasured.',
    integrated: true,
    icon: 'satellite_alt',
  },
  {
    id: 'nwic-rainfall',
    dataset: 'NWIC Rainfall',
    ministry: 'MoES (NWIC)',
    years: 'Daily',
    granularity: 'District',
    freshness: NOT_INGESTED,
    limitations: 'Not connected yet. Gaps in station coverage expected.',
    integrated: false,
    icon: 'rainy',
    sourceUrl: 'https://indiawris.gov.in',
  },
  {
    id: 'isro-landuse',
    dataset: 'Land Use Pattern',
    ministry: 'ISRO',
    years: 'Latest',
    granularity: 'District / State',
    freshness: NOT_INGESTED,
    limitations: 'Not connected yet. Coarse resolution.',
    integrated: false,
    icon: 'satellite_alt',
    sourceUrl: 'https://bhuvan.nrsc.gov.in',
  },
  {
    id: 'mission-antyodaya',
    dataset: 'Mission Antyodaya / PCA',
    ministry: 'GoI',
    years: 'Latest',
    granularity: 'Block / District',
    freshness: NOT_INGESTED,
    limitations: 'Not connected yet. Limited geographies.',
    integrated: false,
    icon: 'diversity_3',
    sourceUrl: 'https://missionantyodaya.nic.in',
  },
  {
    id: 'gsi-seismic',
    dataset: 'Seismic Zone Factors',
    ministry: 'GSI',
    years: 'Latest',
    granularity: 'Town / District',
    freshness: NOT_INGESTED,
    limitations: 'Not connected yet. Town-level only, weak correlation.',
    integrated: false,
    icon: 'landscape',
    sourceUrl: 'https://www.gsi.gov.in',
  },
];
