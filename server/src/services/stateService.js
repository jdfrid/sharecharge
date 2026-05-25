import { query } from '../db/pool.js';
import {
  rowToBooking,
  rowToDispute,
  rowToStation,
  rowToTransaction,
  rowToUser,
} from '../utils.js';

export async function loadFullState() {
  const [settingsRes, usersRes, stationsRes, bookingsRes, txRes, disputesRes, eventsRes] = await Promise.all([
    query('SELECT * FROM settings WHERE id = 1'),
    query('SELECT * FROM users ORDER BY created_at DESC'),
    query('SELECT * FROM stations ORDER BY created_at DESC NULLS LAST'),
    query('SELECT * FROM bookings ORDER BY created_at DESC'),
    query('SELECT * FROM transactions ORDER BY created_at DESC'),
    query('SELECT * FROM disputes ORDER BY created_at DESC'),
    query('SELECT * FROM audit_events ORDER BY time DESC LIMIT 20'),
  ]);

  const s = settingsRes.rows[0];
  return {
    settings: {
      commission: Number(s?.commission ?? 12.5),
      cancellationFee: Number(s?.cancellation_fee ?? 15),
      otpWindowMinutes: Number(s?.otp_window_minutes ?? 15),
    },
    users: usersRes.rows.map(rowToUser),
    stations: stationsRes.rows.map(rowToStation),
    bookings: bookingsRes.rows.map(rowToBooking),
    transactions: txRes.rows.map(rowToTransaction),
    disputes: disputesRes.rows.map(rowToDispute),
    events: eventsRes.rows.map((r) => ({
      id: r.id,
      text: r.text,
      type: r.type,
      time: Number(r.time),
    })),
  };
}

export async function addEvent(text, type = 'activity') {
  const id = `event-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  await query('INSERT INTO audit_events (id, text, type, time) VALUES ($1, $2, $3, $4)', [
    id,
    text,
    type,
    Date.now(),
  ]);
}

export async function getSettings() {
  const { rows } = await query('SELECT * FROM settings WHERE id = 1');
  const s = rows[0];
  return {
    commission: Number(s.commission),
    cancellationFee: Number(s.cancellation_fee),
    otpWindowMinutes: Number(s.otp_window_minutes),
  };
}
