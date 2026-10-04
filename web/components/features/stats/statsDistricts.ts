import type { StatsDistrict } from './types';

/**
 * Districts offered on the District Brief and Model vs History tabs.
 *
 * Only identity and map framing live here. Every figure shown for a district (cells,
 * habitations, population, drivers, model version) comes from `GET /hazard/summary` and
 * `GET /hazard/cells`. Districts without a computed layer are expected: the API reports
 * `model_status: 'not_computed'` and the tabs show that state.
 */
export const STATS_DISTRICTS: StatsDistrict[] = [
  { name: 'Barpeta', state: 'Assam', lgdCode: 277, lat: 26.321, lng: 91.006, zoom: 10.8 },
  { name: 'Rudraprayag', state: 'Uttarakhand', lgdCode: 55, lat: 30.285, lng: 78.981, zoom: 11.2 },
  { name: 'Wayanad', state: 'Kerala', lgdCode: 555, lat: 11.685, lng: 76.132, zoom: 11.0 },
  { name: 'Kodagu', state: 'Karnataka', lgdCode: 540, lat: 12.424, lng: 75.738, zoom: 10.9 },
  { name: 'Morena', state: 'Madhya Pradesh', lgdCode: 417, lat: 26.495, lng: 77.994, zoom: 10.7 },
  { name: 'Dholpur', state: 'Rajasthan', lgdCode: 98, lat: 26.702, lng: 77.896, zoom: 10.7 },
  { name: 'Srinagar', state: 'Jammu & Kashmir', lgdCode: 12, lat: 34.0837, lng: 74.7973, zoom: 10.9 },
  { name: 'Leh', state: 'Ladakh', lgdCode: 9, lat: 34.1526, lng: 77.5771, zoom: 10.5 },
];
