import { query } from '../db/pool.js';
import {
  addEventMem,
  getSettingsMem,
  loadFullStateMem,
} from '../devDataStore.js';
import {
  rowToBooking,
  rowToDispute,
  rowToPayment,
  rowToPaymentMethod,
  rowToPaymentSplit,
  rowToServiceBid,
  rowToServiceRequest,
  rowToStation,
  rowToTransaction,
  rowToUser,
} from '../utils.js';

export async function loadFullState(dbReady = true) {
  if (!dbReady) {
    return loadFullStateMem();
  }

  const [settingsRes, usersRes, stationsRes, bookingsRes, txRes, disputesRes, eventsRes, requestsRes, bidsRes, paymentsRes, methodsRes] =
    await Promise.all([
    query('SELECT * FROM settings WHERE id = 1'),
    query('SELECT * FROM users ORDER BY created_at DESC'),
    query('SELECT * FROM stations ORDER BY created_at DESC NULLS LAST'),
    query('SELECT * FROM bookings ORDER BY created_at DESC'),
    query('SELECT * FROM transactions ORDER BY created_at DESC'),
    query('SELECT * FROM disputes ORDER BY created_at DESC'),
    query('SELECT * FROM audit_events ORDER BY time DESC LIMIT 20'),
    query('SELECT * FROM service_requests ORDER BY created_at DESC').catch(() => ({ rows: [] })),
    query('SELECT * FROM service_bids ORDER BY created_at DESC').catch(() => ({ rows: [] })),
    query('SELECT * FROM payments ORDER BY created_at DESC').catch(() => ({ rows: [] })),
    query('SELECT * FROM payment_methods ORDER BY created_at DESC').catch(() => ({ rows: [] })),
  ]);

  const s = settingsRes.rows[0];
  const paymentRows = paymentsRes.rows.map(rowToPayment);
  if (paymentsRes.rows.length) {
    const splitRes = await query('SELECT * FROM payment_splits ORDER BY created_at').catch(() => ({ rows: [] }));
    const byPayment = new Map();
    for (const row of splitRes.rows) {
      const split = rowToPaymentSplit(row);
      if (!byPayment.has(split.paymentId)) byPayment.set(split.paymentId, []);
      byPayment.get(split.paymentId).push(split);
    }
    for (const payment of paymentRows) {
      payment.splits = byPayment.get(payment.id) || [];
    }
  }
  return {
    settings: {
      commission: Number(s?.commission ?? 12.5),
      cancellationFee: Number(s?.cancellation_fee ?? 15),
      otpWindowMinutes: Number(s?.otp_window_minutes ?? 15),
      requireManagerApproval: !!s?.require_manager_approval,
    },
    users: usersRes.rows.map(rowToUser),
    stations: stationsRes.rows.map(rowToStation),
    bookings: bookingsRes.rows.map(rowToBooking),
    transactions: txRes.rows.map(rowToTransaction),
    disputes: disputesRes.rows.map(rowToDispute),
    serviceRequests: requestsRes.rows.map(rowToServiceRequest),
    serviceBids: bidsRes.rows.map(rowToServiceBid),
    payments: paymentRows,
    paymentMethods: methodsRes.rows.map(rowToPaymentMethod),
    events: eventsRes.rows.map((r) => ({
      id: r.id,
      text: r.text,
      type: r.type,
      time: Number(r.time),
    })),
  };
}

export async function addEvent(text, type = 'activity', dbReady = true) {
  if (!dbReady) {
    addEventMem(text, type);
    return;
  }
  const id = `event-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  await query('INSERT INTO audit_events (id, text, type, time) VALUES ($1, $2, $3, $4)', [
    id,
    text,
    type,
    Date.now(),
  ]);
}

export async function getSettings(dbReady = true) {
  if (!dbReady) return getSettingsMem();
  const { rows } = await query('SELECT * FROM settings WHERE id = 1');
  const s = rows[0];
  return {
    commission: Number(s.commission),
    cancellationFee: Number(s.cancellation_fee),
    otpWindowMinutes: Number(s.otp_window_minutes),
    requireManagerApproval: !!s.require_manager_approval,
  };
}
