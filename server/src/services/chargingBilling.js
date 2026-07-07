/**
 * Estimate kWh from charging session duration × station power (kW).
 */
export function calculateKwhFromSession({ startedAt, completedAt, stationPowerKw, minKwh = 0.3 }) {
  if (!startedAt) return null;
  const end = completedAt || Date.now();
  const hours = Math.max(0, (Number(end) - Number(startedAt)) / 3600000);
  const powerKw = Number(stationPowerKw) > 0 ? Number(stationPowerKw) : 22;
  const kwh = Number((hours * powerKw).toFixed(2));
  return Math.max(minKwh, kwh);
}

export function calculateBookingAmount({ kwh, pricePerKwh, commissionPct = 12.5 }) {
  const amount = Number((Number(kwh) * Number(pricePerKwh)).toFixed(2));
  const platformFee = Number((amount * commissionPct / 100).toFixed(2));
  const hostShare = Number((amount - platformFee).toFixed(2));
  return { kwh: Number(kwh), amount, platformFee, hostShare };
}
