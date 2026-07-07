export const ACTIVE_BOOKING_STATUSES = ['pending', 'approved', 'on_way', 'otp_verified', 'charging'];

export function activeBookingStatusesSql() {
  return ACTIVE_BOOKING_STATUSES.map((status) => `'${status}'`).join(', ');
}

export async function findActiveBookingForStation(query, stationId, dbReady) {
  if (!dbReady) return null;
  const { rows } = await query(
    `SELECT id, status FROM bookings
     WHERE station_id = $1 AND status IN (${activeBookingStatusesSql()})
     ORDER BY created_at DESC LIMIT 1`,
    [stationId],
  );
  return rows[0] || null;
}

export async function assertStationBookable(query, station, dbReady) {
  if (!station) return { error: 'station_not_found' };
  if (!station.available) return { error: 'station_unavailable' };

  if (dbReady) {
    const active = await findActiveBookingForStation(query, station.id, true);
    if (active) return { error: 'station_occupied', activeBookingId: active.id };
    return { ok: true };
  }

  return { ok: true };
}
