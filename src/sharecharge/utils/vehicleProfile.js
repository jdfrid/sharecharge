import { isChargingStation } from './serviceCategories';

const KEY = 'sharecharge-vehicle-profile-v1';

export const VEHICLE_OPTIONS = ['טסלה', 'יונדאי', 'MG'];

export const PLUG_OPTIONS = [
  { id: 'standard', label: 'שקע רגיל' },
  { id: 'power', label: 'שקע כוח' },
  { id: 'station', label: 'עמדה' },
];

export const SPEED_OPTIONS = [
  { id: 'slow', label: 'איטית', minPower: 0, maxPower: 14 },
  { id: 'medium', label: 'בינונית', minPower: 15, maxPower: 39 },
  { id: 'fast', label: 'מהירה', minPower: 40, maxPower: 999 },
];

const defaults = {
  vehicle: 'טסלה',
  plugId: 'station',
  speedId: 'medium',
};

export function loadVehicleProfile() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaults };
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return { ...defaults };
  }
}

export function saveVehicleProfile(patch) {
  const next = { ...loadVehicleProfile(), ...patch };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function stationMatchesVehicleProfile(station, profile = loadVehicleProfile()) {
  if (!isChargingStation(station)) {
    return { matches: false, reason: 'לא עמדת טעינה' };
  }

  const speed = SPEED_OPTIONS.find((item) => item.id === profile.speedId) || SPEED_OPTIONS[1];
  const power = Number(station.power || 0);

  if (power < speed.minPower) {
    return { matches: false, reason: `הספק ${power}kW נמוך מהמינימום לרכב (${speed.minPower}kW)` };
  }

  if (profile.plugId === 'station') {
    const plug = String(station.plug || '');
    if (!plug.includes('Type') && !plug.includes('CCS')) {
      return { matches: false, reason: 'סוג שקע שונה' };
    }
  }

  if (power > speed.maxPower) {
    return { matches: true, reason: 'עמדה מהירה — מתאימה גם לטעינה בינונית' };
  }

  return { matches: true, reason: '' };
}

export function filterChargingStations(stations, profile = loadVehicleProfile(), { hideNonMatching = false } = {}) {
  return stations
    .filter((station) => isChargingStation(station))
    .filter((station) => {
      if (!hideNonMatching) return true;
      return stationMatchesVehicleProfile(station, profile).matches;
    })
    .map((station) => {
      const { matches, reason } = stationMatchesVehicleProfile(station, profile);
      return { ...station, vehicleMatch: matches, vehicleMatchReason: reason };
    });
}
