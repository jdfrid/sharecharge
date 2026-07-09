import { query } from '../db/pool.js';
import { CHARGING_CATEGORY } from '../services/serviceCategories.js';

const SOS_CATEGORIES = new Set(['fuel', 'puncture', 'tow', 'garage', 'battery', 'bakery']);

function normalizeStationCategory(raw) {
  const value = String(raw || CHARGING_CATEGORY).trim();
  if (value === CHARGING_CATEGORY || SOS_CATEGORIES.has(value)) return value;
  return CHARGING_CATEGORY;
}

async function patchRow(table, id, columnMap, patch, idColumn = 'id') {
  const fields = [];
  const values = [];
  for (const [key, col] of Object.entries(columnMap)) {
    if (patch[key] !== undefined) {
      values.push(patch[key]);
      fields.push(`${col} = $${values.length}`);
    }
  }
  if (!fields.length) return { error: 'invalid', detail: 'אין שדות לעדכון', status: 400 };
  values.push(id);
  await query(`UPDATE ${table} SET ${fields.join(', ')} WHERE ${idColumn} = $${values.length}`, values);
  return { ok: true };
}

export async function updateUserDb(id, patch) {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
  if (!rows[0]) return { error: 'not_found', status: 404 };
  if (rows[0].role === 'admin' && patch.blocked === true) {
    return { error: 'forbidden', detail: 'לא ניתן לחסום מנהל', status: 403 };
  }
  const data = { ...patch };
  if (data.email) data.email = String(data.email).toLowerCase().trim();
  await patchRow('users', id, {
    name: 'name',
    email: 'email',
    phone: 'phone',
    blocked: 'blocked',
    verified: 'verified',
  }, data);
  const updated = (await query('SELECT * FROM users WHERE id = $1', [id])).rows[0];
  return { ok: true, name: updated.name };
}

export async function updateStationDb(id, patch) {
  const { rows } = await query('SELECT * FROM stations WHERE id = $1', [id]);
  if (!rows[0]) return { error: 'not_found', status: 404 };
  const data = { ...patch };
  if (data.serviceCategory !== undefined) data.serviceCategory = normalizeStationCategory(data.serviceCategory);
  await patchRow('stations', id, {
    name: 'name',
    address: 'address',
    hostId: 'host_id',
    lat: 'lat',
    lng: 'lng',
    distance: 'distance',
    power: 'power',
    plug: 'plug',
    pricePerKwh: 'price_per_kwh',
    available: 'available',
    termsText: 'terms_text',
    serviceCategory: 'service_category',
  }, data);
  return { ok: true, name: rows[0].name };
}

export async function updateBookingDb(id, patch) {
  const { rows } = await query('SELECT * FROM bookings WHERE id = $1', [id]);
  if (!rows[0]) return { error: 'not_found', status: 404 };
  await patchRow('bookings', id, {
    status: 'status',
    amount: 'amount',
    kwh: 'kwh',
    stationId: 'station_id',
    driverId: 'driver_id',
    hostId: 'host_id',
    startTime: 'start_time',
    durationHours: 'duration_hours',
  }, patch);
  return { ok: true };
}

export async function updateTenderDb(id, patch) {
  const { rows } = await query('SELECT * FROM service_requests WHERE id = $1', [id]);
  if (!rows[0]) return { error: 'not_found', status: 404 };
  const data = { ...patch };
  if (data.vehicleProfile !== undefined) data.vehicleProfile = JSON.stringify(data.vehicleProfile || {});
  await patchRow('service_requests', id, {
    status: 'status',
    category: 'category',
    addressText: 'address_text',
    problemDescription: 'problem_description',
    phone: 'phone',
    lat: 'lat',
    lng: 'lng',
    amount: 'amount',
    hostId: 'host_id',
    driverId: 'driver_id',
    notifyRadiusKm: 'notify_radius_km',
    vehicleProfile: 'vehicle_profile',
  }, data);
  return { ok: true, category: rows[0].category };
}

export async function updateBidDb(requestId, bidId, patch) {
  const { rows } = await query('SELECT * FROM service_bids WHERE id = $1 AND request_id = $2', [bidId, requestId]);
  if (!rows[0]) return { error: 'not_found', status: 404 };
  const data = { ...patch };
  if (data.lineItems !== undefined) data.lineItems = JSON.stringify(data.lineItems || []);
  await patchRow('service_bids', bidId, {
    status: 'status',
    total: 'total',
    etaMinutes: 'eta_minutes',
    hostId: 'host_id',
    lineItems: 'line_items',
    driverCounterTotal: 'driver_counter_total',
    driverCounterEtaMinutes: 'driver_counter_eta_minutes',
    driverCounterMessage: 'driver_counter_message',
    driverCounterAt: 'driver_counter_at',
  }, data, 'id');
  return { ok: true };
}

export async function deleteBidDb(requestId, bidId) {
  const { rows } = await query('SELECT * FROM service_bids WHERE id = $1 AND request_id = $2', [bidId, requestId]);
  if (!rows[0]) return { error: 'not_found', status: 404 };
  await query('DELETE FROM service_bids WHERE id = $1', [bidId]);
  return { ok: true };
}

export async function updateDisputeDb(id, patch) {
  const { rows } = await query('SELECT * FROM disputes WHERE id = $1', [id]);
  if (!rows[0]) return { error: 'not_found', status: 404 };
  await patchRow('disputes', id, { status: 'status', reason: 'reason' }, patch);
  return { ok: true };
}

export async function updatePaymentDb(id, patch) {
  const { rows } = await query('SELECT * FROM payments WHERE id = $1', [id]);
  if (!rows[0]) return { error: 'not_found', status: 404 };
  await patchRow('payments', id, {
    status: 'status',
    amount: 'amount',
    title: 'title',
    hostId: 'host_id',
    payerId: 'payer_id',
  }, patch);
  return { ok: true };
}
