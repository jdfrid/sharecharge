export const CHARGING_CATEGORY = 'charging';

export const EMERGENCY_PROVIDER_CATEGORIES = ['fuel', 'puncture', 'bakery', 'tow', 'garage', 'battery'];

export const SERVICE_CATEGORY_LABELS = {
  charging: 'עמדת טעינה',
  fuel: 'דלק',
  puncture: "פנצ'ר",
  bakery: "פנצ'ריה",
  tow: 'גרר',
  garage: 'מוסך',
  battery: 'מצבר',
};

/** Emergency type → provider station categories (strict — no cross-mixing) */
export const EMERGENCY_SERVICE_MAP = {
  flat_tire: ['puncture', 'bakery'],
  fuel: ['fuel'],
  tow: ['tow'],
  battery: ['garage', 'battery'],
};

export function normalizeServiceCategory(station) {
  return station?.serviceCategory || CHARGING_CATEGORY;
}

export function isChargingStation(station) {
  return normalizeServiceCategory(station) === CHARGING_CATEGORY;
}

export function isEmergencyProviderStation(station) {
  return !isChargingStation(station);
}

export function serviceCategoriesForEmergency(categoryId) {
  return EMERGENCY_SERVICE_MAP[categoryId] || [];
}

export function stationMatchesEmergencyCategory(station, emergencyCategory) {
  const allowed = serviceCategoriesForEmergency(emergencyCategory);
  if (!allowed.length) return false;
  return allowed.includes(normalizeServiceCategory(station));
}

export function filterChargingStationsOnly(stations = []) {
  return stations.filter(isChargingStation);
}

export function filterEmergencyStations(stations = [], emergencyCategory) {
  return stations.filter(
    (station) => isEmergencyProviderStation(station) && stationMatchesEmergencyCategory(station, emergencyCategory),
  );
}

export function serviceCategoryLabel(category) {
  return SERVICE_CATEGORY_LABELS[category] || category || 'שירות';
}
