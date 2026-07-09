import { query } from '../db/pool.js';

async function deleteBookingsByIds(bookingIds) {
  if (!bookingIds.length) return;
  const placeholders = bookingIds.map((_, i) => `$${i + 1}`).join(',');
  await query(`DELETE FROM transactions WHERE booking_id IN (${placeholders})`, bookingIds);
  await query(`DELETE FROM disputes WHERE booking_id IN (${placeholders})`, bookingIds);
  await query(`DELETE FROM bookings WHERE id IN (${placeholders})`, bookingIds);
}

export async function deleteUserDb(userId) {
  const { rows } = await query('SELECT id, role, name FROM users WHERE id = $1', [userId]);
  const user = rows[0];
  if (!user) return { error: 'not_found', status: 404 };
  if (user.role === 'admin') return { error: 'forbidden', detail: 'לא ניתן למחוק מנהל מערכת', status: 403 };

  const { rows: bookingRows } = await query(
    'SELECT id FROM bookings WHERE driver_id = $1 OR host_id = $1',
    [userId],
  );
  await deleteBookingsByIds(bookingRows.map((r) => r.id));

  await query('DELETE FROM service_requests WHERE driver_id = $1', [userId]);
  await query('DELETE FROM payments WHERE payer_id = $1 OR host_id = $1', [userId]);
  await query('DELETE FROM payment_methods WHERE user_id = $1', [userId]);

  const { rows: stationRows } = await query('SELECT id FROM stations WHERE host_id = $1', [userId]);
  for (const station of stationRows) {
    await deleteStationDb(station.id, { skipHostCheck: true });
  }

  await query('DELETE FROM users WHERE id = $1', [userId]);
  return { ok: true, name: user.name };
}

export async function deleteStationDb(stationId, { skipHostCheck = false } = {}) {
  const { rows } = await query('SELECT id, name FROM stations WHERE id = $1', [stationId]);
  const station = rows[0];
  if (!station) return { error: 'not_found', status: 404 };

  const { rows: bookingRows } = await query('SELECT id FROM bookings WHERE station_id = $1', [stationId]);
  await deleteBookingsByIds(bookingRows.map((r) => r.id));
  await query('DELETE FROM stations WHERE id = $1', [stationId]);
  return { ok: true, name: station.name, skipHostCheck };
}

export async function deleteBookingDb(bookingId) {
  const { rows } = await query('SELECT id FROM bookings WHERE id = $1', [bookingId]);
  if (!rows[0]) return { error: 'not_found', status: 404 };
  await deleteBookingsByIds([bookingId]);
  return { ok: true };
}

export async function deleteTenderDb(tenderId) {
  const { rows } = await query('SELECT id, category FROM service_requests WHERE id = $1', [tenderId]);
  if (!rows[0]) return { error: 'not_found', status: 404 };
  await query('DELETE FROM service_requests WHERE id = $1', [tenderId]);
  return { ok: true, category: rows[0].category };
}

export async function deleteDisputeDb(disputeId) {
  const { rows } = await query('SELECT id FROM disputes WHERE id = $1', [disputeId]);
  if (!rows[0]) return { error: 'not_found', status: 404 };
  await query('DELETE FROM disputes WHERE id = $1', [disputeId]);
  return { ok: true };
}

export async function deletePaymentDb(paymentId) {
  const { rows } = await query('SELECT id FROM payments WHERE id = $1', [paymentId]);
  if (!rows[0]) return { error: 'not_found', status: 404 };
  await query('DELETE FROM payments WHERE id = $1', [paymentId]);
  return { ok: true };
}

export async function clearAuditEventsDb() {
  await query('DELETE FROM audit_events');
  return { ok: true };
}

/** Keeps users + stations; clears operational/test data. */
export async function resetTestingDataDb() {
  await query('DELETE FROM payment_splits');
  await query('DELETE FROM payments');
  await query('DELETE FROM transactions');
  await query('DELETE FROM disputes');
  await query('DELETE FROM bookings');
  await query('DELETE FROM service_bids');
  await query('DELETE FROM service_requests');
  await query('DELETE FROM audit_events');
  return { ok: true };
}
