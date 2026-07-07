export const CHARGING_CATEGORY = 'charging';

export const EMERGENCY_SERVICE_MAP = {
  flat_tire: ['puncture', 'bakery'],
  fuel: ['fuel'],
  tow: ['tow'],
  battery: ['garage', 'battery'],
};

export function normalizeServiceCategory(station) {
  return station?.service_category || station?.serviceCategory || CHARGING_CATEGORY;
}

export function isChargingStation(station) {
  return normalizeServiceCategory(station) === CHARGING_CATEGORY;
}

export function serviceCategoriesForEmergency(categoryId) {
  return EMERGENCY_SERVICE_MAP[categoryId] || [];
}

export function matchesEmergencyCategory(station, emergencyCategory) {
  const allowed = serviceCategoriesForEmergency(emergencyCategory);
  if (!allowed.length) return false;
  return allowed.includes(normalizeServiceCategory(station));
}
