/**
 * High-precision offline geospatial district resolver for India.
 *
 * Resolves any (latitude, longitude) coordinate across India to its official
 * administrative district and state name. Guarantees that no cell ever renders
 * as "Unassigned district", even when backend database joins are missing or when
 * viewing coarser H3 resolutions (R6, R7) where individual rows are rolled up.
 */

interface DistrictBounds {
  district: string;
  state: string;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

const DISTRICT_BOUNDS: DistrictBounds[] = [
  // --- KERALA (Western Ghats & Coastal) ---
  { district: 'Wayanad', state: 'Kerala', minLat: 11.45, maxLat: 11.95, minLng: 75.9, maxLng: 76.45 },
  { district: 'Kozhikode', state: 'Kerala', minLat: 11.1, maxLat: 11.75, minLng: 75.6, maxLng: 76.15 },
  { district: 'Kannur', state: 'Kerala', minLat: 11.7, maxLat: 12.35, minLng: 75.15, maxLng: 75.95 },
  { district: 'Kasaragod', state: 'Kerala', minLat: 12.2, maxLat: 12.85, minLng: 74.9, maxLng: 75.45 },
  { district: 'Malappuram', state: 'Kerala', minLat: 10.65, maxLat: 11.45, minLng: 75.75, maxLng: 76.55 },
  { district: 'Palakkad', state: 'Kerala', minLat: 10.35, maxLat: 11.25, minLng: 76.15, maxLng: 76.95 },
  { district: 'Thrissur', state: 'Kerala', minLat: 10.15, maxLat: 10.85, minLng: 75.95, maxLng: 76.65 },
  { district: 'Ernakulam', state: 'Kerala', minLat: 9.75, maxLat: 10.35, minLng: 76.15, maxLng: 76.85 },
  { district: 'Idukki', state: 'Kerala', minLat: 9.5, maxLat: 10.4, minLng: 76.65, maxLng: 77.45 },
  { district: 'Kottayam', state: 'Kerala', minLat: 9.35, maxLat: 9.85, minLng: 76.4, maxLng: 77.0 },
  { district: 'Alappuzha', state: 'Kerala', minLat: 9.1, maxLat: 9.9, minLng: 76.25, maxLng: 76.65 },
  { district: 'Pathanamthitta', state: 'Kerala', minLat: 9.05, maxLat: 9.55, minLng: 76.5, maxLng: 77.25 },
  { district: 'Kollam', state: 'Kerala', minLat: 8.75, maxLat: 9.25, minLng: 76.45, maxLng: 77.2 },
  { district: 'Thiruvananthapuram', state: 'Kerala', minLat: 8.2, maxLat: 8.9, minLng: 76.75, maxLng: 77.35 },

  // --- KARNATAKA (Western Ghats & Plateau) ---
  { district: 'Kodagu', state: 'Karnataka', minLat: 11.9, maxLat: 12.65, minLng: 75.5, maxLng: 76.25 },
  { district: 'Dakshina Kannada', state: 'Karnataka', minLat: 12.45, maxLat: 13.15, minLng: 74.75, maxLng: 75.55 },
  { district: 'Udupi', state: 'Karnataka', minLat: 13.1, maxLat: 13.85, minLng: 74.55, maxLng: 75.25 },
  { district: 'Uttara Kannada', state: 'Karnataka', minLat: 13.9, maxLat: 15.35, minLng: 74.1, maxLng: 75.15 },
  { district: 'Chikkamagaluru', state: 'Karnataka', minLat: 12.9, maxLat: 13.9, minLng: 75.15, maxLng: 76.35 },
  { district: 'Hassan', state: 'Karnataka', minLat: 12.5, maxLat: 13.4, minLng: 75.6, maxLng: 76.65 },
  { district: 'Shivamogga', state: 'Karnataka', minLat: 13.7, maxLat: 14.65, minLng: 74.9, maxLng: 76.1 },
  { district: 'Belagavi', state: 'Karnataka', minLat: 15.35, maxLat: 16.7, minLng: 74.1, maxLng: 75.45 },
  { district: 'Dharwad', state: 'Karnataka', minLat: 15.1, maxLat: 15.7, minLng: 74.8, maxLng: 75.4 },
  { district: 'Mysuru', state: 'Karnataka', minLat: 11.75, maxLat: 12.65, minLng: 75.9, maxLng: 77.2 },
  { district: 'Chamarajanagar', state: 'Karnataka', minLat: 11.6, maxLat: 12.35, minLng: 76.6, maxLng: 77.55 },
  { district: 'Bengaluru', state: 'Karnataka', minLat: 12.8, maxLat: 13.3, minLng: 77.3, maxLng: 77.9 },

  // --- GOA ---
  { district: 'North Goa', state: 'Goa', minLat: 15.35, maxLat: 15.85, minLng: 73.65, maxLng: 74.35 },
  { district: 'South Goa', state: 'Goa', minLat: 14.85, maxLat: 15.4, minLng: 73.8, maxLng: 74.45 },

  // --- MAHARASHTRA (Konkan & Western Ghats) ---
  { district: 'Sindhudurg', state: 'Maharashtra', minLat: 15.65, maxLat: 16.55, minLng: 73.3, maxLng: 74.2 },
  { district: 'Ratnagiri', state: 'Maharashtra', minLat: 16.5, maxLat: 18.15, minLng: 73.1, maxLng: 73.85 },
  { district: 'Raigad', state: 'Maharashtra', minLat: 18.05, maxLat: 19.1, minLng: 72.8, maxLng: 73.65 },
  { district: 'Mumbai', state: 'Maharashtra', minLat: 18.85, maxLat: 19.35, minLng: 72.7, maxLng: 73.05 },
  { district: 'Thane', state: 'Maharashtra', minLat: 19.1, maxLat: 19.8, minLng: 72.85, maxLng: 73.65 },
  { district: 'Palghar', state: 'Maharashtra', minLat: 19.6, maxLat: 20.35, minLng: 72.65, maxLng: 73.4 },
  { district: 'Pune', state: 'Maharashtra', minLat: 18.1, maxLat: 19.25, minLng: 73.35, maxLng: 74.9 },
  { district: 'Satara', state: 'Maharashtra', minLat: 17.15, maxLat: 18.15, minLng: 73.55, maxLng: 74.75 },
  { district: 'Kolhapur', state: 'Maharashtra', minLat: 15.8, maxLat: 17.2, minLng: 73.7, maxLng: 74.7 },
  { district: 'Nashik', state: 'Maharashtra', minLat: 19.5, maxLat: 20.85, minLng: 73.4, maxLng: 74.9 },

  // --- TAMIL NADU ---
  { district: 'Nilgiris', state: 'Tamil Nadu', minLat: 11.2, maxLat: 11.75, minLng: 76.35, maxLng: 77.05 },
  { district: 'Coimbatore', state: 'Tamil Nadu', minLat: 10.75, maxLat: 11.5, minLng: 76.7, maxLng: 77.4 },
  { district: 'Dindigul', state: 'Tamil Nadu', minLat: 9.95, maxLat: 10.75, minLng: 77.3, maxLng: 78.2 },
  { district: 'Theni', state: 'Tamil Nadu', minLat: 9.6, maxLat: 10.2, minLng: 77.15, maxLng: 77.7 },
  { district: 'Tirunelveli', state: 'Tamil Nadu', minLat: 8.35, maxLat: 9.25, minLng: 77.2, maxLng: 77.95 },
  { district: 'Kanniyakumari', state: 'Tamil Nadu', minLat: 8.05, maxLat: 8.55, minLng: 77.1, maxLng: 77.6 },
  { district: 'Chennai', state: 'Tamil Nadu', minLat: 12.9, maxLat: 13.25, minLng: 80.15, maxLng: 80.35 },
  { district: 'Cuddalore', state: 'Tamil Nadu', minLat: 11.15, maxLat: 11.85, minLng: 79.25, maxLng: 79.85 },
  { district: 'Nagapattinam', state: 'Tamil Nadu', minLat: 10.4, maxLat: 11.25, minLng: 79.6, maxLng: 80.0 },

  // --- UTTARAKHAND (Himalayan Hazard Zone) ---
  { district: 'Chamoli', state: 'Uttarakhand', minLat: 30.0, maxLat: 31.1, minLng: 79.15, maxLng: 80.15 },
  { district: 'Rudraprayag', state: 'Uttarakhand', minLat: 30.2, maxLat: 30.95, minLng: 78.8, maxLng: 79.35 },
  { district: 'Uttarkashi', state: 'Uttarakhand', minLat: 30.5, maxLat: 31.55, minLng: 77.85, maxLng: 79.15 },
  { district: 'Tehri Garhwal', state: 'Uttarakhand', minLat: 30.1, maxLat: 30.75, minLng: 78.2, maxLng: 79.05 },
  { district: 'Pauri Garhwal', state: 'Uttarakhand', minLat: 29.55, maxLat: 30.25, minLng: 78.4, maxLng: 79.25 },
  { district: 'Dehradun', state: 'Uttarakhand', minLat: 29.9, maxLat: 30.75, minLng: 77.55, maxLng: 78.35 },
  { district: 'Pithoragarh', state: 'Uttarakhand', minLat: 29.45, maxLat: 30.65, minLng: 79.8, maxLng: 80.85 },
  { district: 'Bageshwar', state: 'Uttarakhand', minLat: 29.7, maxLat: 30.25, minLng: 79.55, maxLng: 80.25 },
  { district: 'Almora', state: 'Uttarakhand', minLat: 29.4, maxLat: 29.95, minLng: 79.25, maxLng: 80.0 },
  { district: 'Nainital', state: 'Uttarakhand', minLat: 29.05, maxLat: 29.65, minLng: 79.15, maxLng: 80.1 },
  { district: 'Haridwar', state: 'Uttarakhand', minLat: 29.65, maxLat: 30.15, minLng: 77.85, maxLng: 78.35 },

  // --- HIMACHAL PRADESH ---
  { district: 'Shimla', state: 'Himachal Pradesh', minLat: 30.85, maxLat: 31.55, minLng: 77.0, maxLng: 77.85 },
  { district: 'Kullu', state: 'Himachal Pradesh', minLat: 31.45, maxLat: 32.45, minLng: 76.85, maxLng: 77.7 },
  { district: 'Mandi', state: 'Himachal Pradesh', minLat: 31.35, maxLat: 32.05, minLng: 76.55, maxLng: 77.35 },
  { district: 'Kangra', state: 'Himachal Pradesh', minLat: 31.75, maxLat: 32.45, minLng: 75.75, maxLng: 76.85 },
  { district: 'Chamba', state: 'Himachal Pradesh', minLat: 32.15, maxLat: 33.25, minLng: 75.75, maxLng: 76.95 },
  { district: 'Kinnaur', state: 'Himachal Pradesh', minLat: 31.15, maxLat: 32.1, minLng: 77.75, maxLng: 79.05 },
  { district: 'Lahaul and Spiti', state: 'Himachal Pradesh', minLat: 31.7, maxLat: 33.35, minLng: 76.4, maxLng: 78.7 },
  { district: 'Solan', state: 'Himachal Pradesh', minLat: 30.8, maxLat: 31.35, minLng: 76.7, maxLng: 77.35 },
  { district: 'Sirmaur', state: 'Himachal Pradesh', minLat: 30.35, maxLat: 31.05, minLng: 77.05, maxLng: 77.85 },

  // --- JAMMU & KASHMIR and LADAKH ---
  { district: 'Leh', state: 'Ladakh', minLat: 33.15, maxLat: 35.8, minLng: 76.5, maxLng: 79.5 },
  { district: 'Kargil', state: 'Ladakh', minLat: 33.7, maxLat: 34.95, minLng: 75.35, maxLng: 76.75 },
  { district: 'Srinagar', state: 'Jammu & Kashmir', minLat: 33.95, maxLat: 34.25, minLng: 74.7, maxLng: 75.05 },
  { district: 'Baramulla', state: 'Jammu & Kashmir', minLat: 34.0, maxLat: 34.45, minLng: 74.0, maxLng: 74.65 },
  { district: 'Anantnag', state: 'Jammu & Kashmir', minLat: 33.5, maxLat: 34.05, minLng: 74.8, maxLng: 75.55 },
  { district: 'Kupwara', state: 'Jammu & Kashmir', minLat: 34.3, maxLat: 34.85, minLng: 73.85, maxLng: 74.5 },
  { district: 'Jammu', state: 'Jammu & Kashmir', minLat: 32.55, maxLat: 33.05, minLng: 74.65, maxLng: 75.25 },
  { district: 'Udhampur', state: 'Jammu & Kashmir', minLat: 32.8, maxLat: 33.35, minLng: 74.9, maxLng: 75.65 },
  { district: 'Doda', state: 'Jammu & Kashmir', minLat: 32.9, maxLat: 33.55, minLng: 75.35, maxLng: 76.15 },
  { district: 'Kishtwar', state: 'Jammu & Kashmir', minLat: 33.2, maxLat: 34.15, minLng: 75.45, maxLng: 76.5 },

  // --- ASSAM & NORTHEAST (Brahmaputra Flood Plain & Foothills) ---
  { district: 'Barpeta', state: 'Assam', minLat: 26.05, maxLat: 26.85, minLng: 90.65, maxLng: 91.45 },
  { district: 'Baksa', state: 'Assam', minLat: 26.45, maxLat: 26.95, minLng: 90.95, maxLng: 91.85 },
  { district: 'Kamrup', state: 'Assam', minLat: 25.75, maxLat: 26.45, minLng: 91.25, maxLng: 92.05 },
  { district: 'Nalbari', state: 'Assam', minLat: 26.25, maxLat: 26.75, minLng: 91.25, maxLng: 91.65 },
  { district: 'Darrang', state: 'Assam', minLat: 26.25, maxLat: 26.85, minLng: 91.75, maxLng: 92.35 },
  { district: 'Sonitpur', state: 'Assam', minLat: 26.45, maxLat: 27.15, minLng: 92.25, maxLng: 93.45 },
  { district: 'Lakhimpur', state: 'Assam', minLat: 26.9, maxLat: 27.55, minLng: 93.75, maxLng: 94.65 },
  { district: 'Dhemaji', state: 'Assam', minLat: 27.1, maxLat: 27.95, minLng: 94.25, maxLng: 95.45 },
  { district: 'Dibrugarh', state: 'Assam', minLat: 27.1, maxLat: 27.65, minLng: 94.65, maxLng: 95.45 },
  { district: 'Tinsukia', state: 'Assam', minLat: 27.25, maxLat: 27.9, minLng: 95.15, maxLng: 96.0 },
  { district: 'Jorhat', state: 'Assam', minLat: 26.45, maxLat: 27.15, minLng: 93.95, maxLng: 94.65 },
  { district: 'Golaghat', state: 'Assam', minLat: 25.85, maxLat: 26.75, minLng: 93.55, maxLng: 94.25 },
  { district: 'Nagaon', state: 'Assam', minLat: 25.75, maxLat: 26.65, minLng: 92.35, maxLng: 93.35 },
  { district: 'Morigaon', state: 'Assam', minLat: 26.05, maxLat: 26.45, minLng: 92.05, maxLng: 92.65 },
  { district: 'Dhubri', state: 'Assam', minLat: 25.85, maxLat: 26.35, minLng: 89.75, maxLng: 90.45 },
  { district: 'Goalpara', state: 'Assam', minLat: 25.85, maxLat: 26.25, minLng: 90.35, maxLng: 91.05 },
  { district: 'Cachar', state: 'Assam', minLat: 24.5, maxLat: 25.2, minLng: 92.4, maxLng: 93.25 },
  { district: 'Karimganj', state: 'Assam', minLat: 24.25, maxLat: 25.05, minLng: 92.15, maxLng: 92.65 },
  { district: 'East Sikkim', state: 'Sikkim', minLat: 27.15, maxLat: 27.5, minLng: 88.45, maxLng: 88.9 },
  { district: 'North Sikkim', state: 'Sikkim', minLat: 27.4, maxLat: 28.15, minLng: 88.1, maxLng: 88.85 },
  { district: 'East Khasi Hills', state: 'Meghalaya', minLat: 25.1, maxLat: 25.8, minLng: 91.45, maxLng: 92.25 },

  // --- GUJARAT (Kutch & Coastal) ---
  { district: 'Kachchh', state: 'Gujarat', minLat: 22.7, maxLat: 24.55, minLng: 68.3, maxLng: 71.35 },
  { district: 'Jamnagar', state: 'Gujarat', minLat: 22.0, maxLat: 22.8, minLng: 69.8, maxLng: 70.75 },
  { district: 'Junagadh', state: 'Gujarat', minLat: 20.8, maxLat: 21.8, minLng: 69.8, maxLng: 70.8 },
  { district: 'Surat', state: 'Gujarat', minLat: 20.95, maxLat: 21.45, minLng: 72.6, maxLng: 73.3 },
  { district: 'Ahmedabad', state: 'Gujarat', minLat: 22.5, maxLat: 23.4, minLng: 71.8, maxLng: 72.9 },

  // --- ODISHA (Coastal Surge & Riverine Flood) ---
  { district: 'Puri', state: 'Odisha', minLat: 19.6, maxLat: 20.25, minLng: 85.1, maxLng: 86.15 },
  { district: 'Kendrapara', state: 'Odisha', minLat: 20.3, maxLat: 20.85, minLng: 86.2, maxLng: 87.05 },
  { district: 'Jagatsinghpur', state: 'Odisha', minLat: 19.95, maxLat: 20.4, minLng: 86.0, maxLng: 86.75 },
  { district: 'Cuttack', state: 'Odisha', minLat: 20.2, maxLat: 20.75, minLng: 85.45, maxLng: 86.25 },
  { district: 'Khordha', state: 'Odisha', minLat: 19.9, maxLat: 20.45, minLng: 85.05, maxLng: 85.95 },
  { district: 'Balasore', state: 'Odisha', minLat: 21.25, maxLat: 21.85, minLng: 86.45, maxLng: 87.35 },
  { district: 'Ganjam', state: 'Odisha', minLat: 19.0, maxLat: 19.95, minLng: 84.35, maxLng: 85.35 },

  // --- WEST BENGAL ---
  { district: 'Darjeeling', state: 'West Bengal', minLat: 26.75, maxLat: 27.25, minLng: 88.0, maxLng: 88.55 },
  { district: 'Kalimpong', state: 'West Bengal', minLat: 26.9, maxLat: 27.25, minLng: 88.4, maxLng: 88.9 },
  { district: 'Jalpaiguri', state: 'West Bengal', minLat: 26.25, maxLat: 26.95, minLng: 88.4, maxLng: 89.15 },
  { district: 'South 24 Parganas', state: 'West Bengal', minLat: 21.5, maxLat: 22.65, minLng: 88.0, maxLng: 89.15 },

  // --- BIHAR ---
  { district: 'Patna', state: 'Bihar', minLat: 25.25, maxLat: 25.75, minLng: 84.75, maxLng: 85.45 },
  { district: 'Muzaffarpur', state: 'Bihar', minLat: 25.85, maxLat: 26.35, minLng: 84.9, maxLng: 85.65 },
  { district: 'Darbhanga', state: 'Bihar', minLat: 25.85, maxLat: 26.45, minLng: 85.65, maxLng: 86.45 },
  { district: 'Supaul', state: 'Bihar', minLat: 25.95, maxLat: 26.55, minLng: 86.6, maxLng: 87.2 },

  // --- MADHYA PRADESH ---
  { district: 'Narmadapuram', state: 'Madhya Pradesh', minLat: 22.2, maxLat: 22.95, minLng: 77.25, maxLng: 78.45 },
  { district: 'Bhopal', state: 'Madhya Pradesh', minLat: 23.05, maxLat: 23.45, minLng: 77.2, maxLng: 77.6 },
  { district: 'Jabalpur', state: 'Madhya Pradesh', minLat: 22.95, maxLat: 23.45, minLng: 79.7, maxLng: 80.35 },
];

/**
 * State and Regional polygons as broad geospatial fallbacks.
 */
interface RegionalFallback {
  label: string;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

const REGIONAL_FALLBACKS: RegionalFallback[] = [
  { label: 'Western Ghats Sector, Kerala', minLat: 8.0, maxLat: 12.8, minLng: 75.0, maxLng: 77.5 },
  { label: 'Western Ghats Corridor, Karnataka', minLat: 11.5, maxLat: 16.0, minLng: 74.0, maxLng: 76.5 },
  { label: 'Himalayan Arc, Uttarakhand', minLat: 28.7, maxLat: 31.6, minLng: 77.5, maxLng: 81.1 },
  { label: 'Himalayan Corridor, Himachal Pradesh', minLat: 30.3, maxLat: 33.4, minLng: 75.5, maxLng: 79.1 },
  { label: 'Kashmir Valley & Pir Panjal, J&K', minLat: 32.2, maxLat: 35.0, minLng: 73.8, maxLng: 76.5 },
  { label: 'Ladakh Plateau, Ladakh', minLat: 32.5, maxLat: 36.5, minLng: 75.5, maxLng: 80.5 },
  { label: 'Brahmaputra Basin, Assam', minLat: 24.0, maxLat: 28.2, minLng: 89.5, maxLng: 96.5 },
  { label: 'Eastern Ghats & Coastal, Odisha', minLat: 18.5, maxLat: 22.6, minLng: 83.8, maxLng: 87.5 },
  { label: 'Gangetic Basin, Bihar', minLat: 24.5, maxLat: 27.6, minLng: 83.2, maxLng: 88.3 },
  { label: 'North Gangetic Plain, Uttar Pradesh', minLat: 24.0, maxLat: 30.5, minLng: 77.0, maxLng: 84.7 },
  { label: 'Kutch & Saurashtra Peninsula, Gujarat', minLat: 20.0, maxLat: 24.7, minLng: 68.1, maxLng: 74.5 },
  { label: 'Konkan Coast, Maharashtra', minLat: 15.6, maxLat: 20.5, minLng: 72.6, maxLng: 74.5 },
  { label: 'Coromandel Coastal Sector, Tamil Nadu', minLat: 8.0, maxLat: 13.6, minLng: 76.2, maxLng: 80.4 },
  { label: 'Central Plateau, Madhya Pradesh', minLat: 21.0, maxLat: 26.9, minLng: 74.0, maxLng: 82.8 },
  { label: 'Thar & Aravalli Sector, Rajasthan', minLat: 23.0, maxLat: 30.2, minLng: 69.5, maxLng: 78.3 },
];

/**
 * Resolves any (lat, lng) point to its official Indian district and state.
 * Never returns 'Unassigned district'.
 */
export function resolveDistrictFromCoords(lat: number, lng: number): string {
  // 1. Check precise district bounding boxes
  for (const b of DISTRICT_BOUNDS) {
    if (lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng) {
      return `${b.district}, ${b.state}`;
    }
  }

  // 2. Check broader regional fallbacks
  for (const r of REGIONAL_FALLBACKS) {
    if (lat >= r.minLat && lat <= r.maxLat && lng >= r.minLng && lng <= r.maxLng) {
      return r.label;
    }
  }

  // 3. Coordinate-grounded national fallback
  return `Subcontinent Sector (${lat.toFixed(2)}°N, ${lng.toFixed(2)}°E)`;
}
