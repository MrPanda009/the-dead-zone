export interface StorySectionData {
  id: string;
  index: string;
  align: 'left' | 'right';
  badge: string;
  badgeTone?: 'critical' | 'warning' | 'emerald' | 'citron';
  title: string;
  subtitle: string;
  description: string;
  pills: string[];
  metrics: { value: string; label: string }[];
  actionLabel?: string;
  actionHref?: string;
}

export const LANDING_STORIES: StorySectionData[] = [
  {
    id: 'triage-workspace',
    index: '01',
    align: 'right', // Globe on left, text on right
    badge: 'DECISION TRIAGE WORKSPACE',
    badgeTone: 'critical',
    title: 'Geospatial Hazard Triage',
    subtitle: 'Interactive 3-panel triage workspace for red-zone habitation classification',
    description:
      'Continuous spatial screening across Uttarakhand and high-risk Himalayan riverine valleys. Aggregates precipitation thresholds, slope failure gradients, and census social vulnerability into real-time Uber H3 hexagons. Instantly filters habitations into Urgent Relocation and Caseload Watch with full SHAP explainability and 72-hour forecast lead time.',
    pills: ['Interactive 3-Panel Triage', 'Uber H3 Res-8 Hexagons', 'PRZ Red-Zone Filtering', 'Urgent vs Caseload Watch'],
    metrics: [
      { value: '3,602', label: 'H3 Grid Decision Cells' },
      { value: '14', label: 'Urgent Red-Zone Habitations' },
    ],
    actionLabel: 'Launch Triage Workspace',
    actionHref: '/workspace',
  },
  {
    id: 'relocation-solver',
    index: '02',
    align: 'left', // Globe on right, text on left
    badge: 'RELOCATION',
    badgeTone: 'emerald',
    title: 'Relocation',
    subtitle: 'Multi-criteria linear programming optimization for resettlement site selection',
    description:
      'Moving endangered communities requires mathematically sound, humane planning. TERRA (Terrain-based Environmental Risk and Relocation Analytics) runs linear programming optimization against municipal binding constraints—potable water supply, power grid substations, hospital beds, and school capacity—safely matching displaced habitations to sustainable host sites without overwhelming local infrastructure.',
    pills: ['Linear Programming Solver', 'Municipal Binding Constraints', 'Candidate Host Sites', 'Suitability Ranking'],
    metrics: [
      { value: '98.4%', label: 'Constraint Satisfaction' },
      { value: '48h', label: 'Relocation Plan Generation' },
    ],
    actionLabel: 'Open Relocation',
    actionHref: '/relocation',
  },
  {
    id: 'tourist-stories',
    index: '03',
    align: 'right', // Globe on left, text on right
    badge: 'ASSESS',
    badgeTone: 'citron',
    title: 'Assess',
    subtitle: 'Interactive Survey of India national map, pilgrimage corridors & NDRF alerts',
    description:
      'Real-time ground-truth travel intelligence and hazard advisories for pilgrims, tourists, and state disaster authorities. Features an official Survey of India map covering all 28+ States and Union Territories (including complete Jammu & Kashmir and Ladakh), live monsoon landslide warnings, high-altitude road closures, and direct 24/7 NDRF emergency helpline dispatch.',
    pills: ['Survey of India Map', 'Pilgrimage Corridor Alerts', 'Live Landslide Bulletins', 'NDRF 1078 Helpline'],
    metrics: [
      { value: '28+', label: 'States & UTs Monitored' },
      { value: '24/7', label: 'NDRF Crisis Dispatch' },
    ],
    actionLabel: 'Explore Assess',
    actionHref: '/stories',
  },
];

