export function calculateKwhFromSession({ startedAt, completedAt, stationPowerKw, minKwh = 0.3 }) {
  if (!startedAt) return null;
  const end = completedAt || Date.now();
  const hours = Math.max(0, (Number(end) - Number(startedAt)) / 3600000);
  const powerKw = Number(stationPowerKw) > 0 ? Number(stationPowerKw) : 22;
  const kwh = Number((hours * powerKw).toFixed(2));
  return Math.max(minKwh, kwh);
}

export function formatChargingDuration(startedAt, now = Date.now()) {
  if (!startedAt) return '—';
  const mins = Math.max(0, Math.floor((now - startedAt) / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}:${String(m).padStart(2, '0')} שעות` : `${m} דק׳`;
}
