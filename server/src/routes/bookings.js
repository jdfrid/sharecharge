import { Router } from 'express';
import { query } from '../db/pool.js';
import {
  createBookingMem,
  finishBookingMem,
  getBookingRowMem,
  listBookingsMem,
  openDisputeMem,
  updateBookingLocationMem,
  updateBookingMem,
} from '../devDataStore.js';
import { haversineKm, isWithinStationGeofence } from '../geo.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { addEvent, getSettings } from '../services/stateService.js';
import { createId, createOtp, rowToBooking } from '../utils.js';

const router = Router();

function dbReady(req) {
  return !!req.app.locals.dbReady;
}

router.get('/', authRequired, async (req, res) => {
  try {
    if (!dbReady(req)) {
      return res.json({ bookings: listBookingsMem(req.user) });
    }
    let sql = 'SELECT * FROM bookings';
    const params = [];
    if (req.user.role === 'driver') {
      params.push(req.user.sub);
      sql += ' WHERE driver_id = $1';
    } else if (req.user.role === 'host') {
      params.push(req.user.sub);
      sql += ' WHERE host_id = $1';
    }
    sql += ' ORDER BY created_at DESC';
    const { rows } = await query(sql, params);
    res.json({ bookings: rows.map(rowToBooking) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load bookings' });
  }
});

router.post('/', authRequired, requireRole('driver'), async (req, res) => {
  try {
    const { stationId, startTime, durationHours } = req.body || {};
    if (!dbReady(req)) {
      const result = createBookingMem(req.user, { stationId, startTime, durationHours });
      if (result.error === 'driver_not_found') {
        return res.status(401).json({
          error: 'Session expired',
          detail: 'הסשן פג — צאו והתחברו שוב עם OTP',
        });
      }
      if (result.error === 'station_not_found' || result.error === 'station_unavailable') {
        return res.status(404).json({
          error: 'Station not available',
          detail: result.error === 'station_unavailable'
            ? 'העמדה לא זמינה כרגע'
            : `עמדה לא נמצאה (${stationId || 'חסר מזהה'}) — רעננו את הרשימה`,
        });
      }
      return res.status(201).json({ booking: result.booking });
    }

    const { rows: stationRows } = await query('SELECT * FROM stations WHERE id = $1', [stationId]);
    const station = stationRows[0];
    if (!station || !station.available) return res.status(404).json({ error: 'Station not available' });

    const { rows: userRows } = await query('SELECT * FROM users WHERE id = $1', [req.user.sub]);
    let driver = userRows[0];
    if (!driver && req.user.email) {
      const email = req.user.email.toLowerCase().trim();
      const name = email.split('@')[0] || 'לקוח';
      const inserted = await query(
        `INSERT INTO users (id, name, email, role, verified, blocked, revenue, spend, created_at)
         VALUES ($1, $2, $3, 'driver', true, false, 0, 0, $4)
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
         RETURNING *`,
        [req.user.sub, name, email, Date.now()],
      );
      driver = inserted.rows[0];
    }
    if (!driver) {
      return res.status(401).json({
        error: 'Session expired',
        detail: 'הסשן פג — צאו והתחברו שוב עם OTP',
      });
    }

    const id = createId('booking');
    const now = Date.now();

    await query(
      `INSERT INTO bookings (
        id, station_id, driver_id, driver_email_snapshot, host_id, start_time, duration_hours,
        status, created_at, notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8,'[]')`,
      [
        id,
        stationId,
        driver.id,
        driver.email,
        station.host_id,
        startTime || '19:30',
        Number(durationHours) || 2,
        now,
      ],
    );

    await addEvent(`הזמנה מ${driver.name} (${driver.email}) → ${station.name}`, 'activity', true);
    const { rows } = await query('SELECT * FROM bookings WHERE id = $1', [id]);
    res.status(201).json({ booking: rowToBooking(rows[0]) });
  } catch (err) {
    console.error('[create booking]', err);
    res.status(500).json({
      error: 'Failed to create booking',
      detail: process.env.ALLOW_DEV_OTP === 'true' ? err.message : undefined,
    });
  }
});

router.post('/:id/approve', authRequired, requireRole('host'), async (req, res) => {
  return patchBooking(req, res, async (booking) => {
    if (booking.host_id !== req.user.sub) throw forbidden();
    if (!dbReady(req)) {
      updateBookingMem(booking.id, (row) => {
        row.status = 'approved';
        row.approved_at = Date.now();
      });
      addEvent('הספק אישר בקשת טעינה', 'activity', false);
      return;
    }
    await query(`UPDATE bookings SET status = 'approved', approved_at = $1 WHERE id = $2`, [Date.now(), booking.id]);
    await addEvent('הספק אישר בקשת טעינה', 'activity', true);
  });
});

router.post('/:id/reject', authRequired, requireRole('host'), async (req, res) => {
  return patchBooking(req, res, async (booking) => {
    if (booking.host_id !== req.user.sub) throw forbidden();
    if (!dbReady(req)) {
      updateBookingMem(booking.id, (row) => {
        row.status = 'rejected';
        row.rejected_at = Date.now();
      });
      addEvent('הספק דחה בקשת טעינה', 'warning', false);
      return;
    }
    await query(`UPDATE bookings SET status = 'rejected', rejected_at = $1 WHERE id = $2`, [Date.now(), booking.id]);
    await addEvent('הספק דחה בקשת טעינה', 'warning', true);
  });
});

router.post('/:id/on-way', authRequired, requireRole('driver'), async (req, res) => {
  return patchBooking(req, res, async (booking) => {
    if (booking.driver_id !== req.user.sub) throw forbidden();
    const settings = await getSettings(dbReady(req));
    const otp = createOtp();
    const expires = Date.now() + settings.otpWindowMinutes * 60 * 1000;
    if (!dbReady(req)) {
      updateBookingMem(booking.id, (row) => {
        row.status = 'on_way';
        row.otp = otp;
        row.otp_expires_at = expires;
        row.on_way_at = Date.now();
      });
      addEvent(`הנהג בדרך. נוצר קוד OTP ${otp}`, 'activity', false);
      return;
    }
    await query(
      `UPDATE bookings SET status = 'on_way', otp = $1, otp_expires_at = $2, on_way_at = $3 WHERE id = $4`,
      [otp, expires, Date.now(), booking.id],
    );
    await addEvent(`הנהג בדרך. נוצר קוד OTP ${otp}`, 'activity', true);
  });
});

router.post('/:id/verify-otp', authRequired, requireRole('host'), async (req, res) => {
  try {
    const { otp } = req.body || {};
    if (!dbReady(req)) {
      const booking = getBookingRowMem(req.params.id);
      if (!booking) return res.status(404).json({ error: 'Not found' });
      if (booking.host_id !== req.user.sub) return res.status(403).json({ error: 'Forbidden' });
      if (booking.otp !== String(otp).trim() || Date.now() > Number(booking.otp_expires_at)) {
        return res.status(400).json({ error: 'Invalid OTP' });
      }
      const updated = updateBookingMem(booking.id, (row) => {
        row.status = 'otp_verified';
        row.host_confirmed_connection = true;
        row.otp_verified_at = Date.now();
      });
      addEvent('הספק אימת OTP וחיבור העמדה מוכן', 'activity', false);
      return res.json({ booking: updated, ok: true });
    }

    const { rows } = await query('SELECT * FROM bookings WHERE id = $1', [req.params.id]);
    const booking = rows[0];
    if (!booking) return res.status(404).json({ error: 'Not found' });
    if (booking.host_id !== req.user.sub) return res.status(403).json({ error: 'Forbidden' });
    if (booking.otp !== String(otp).trim() || Date.now() > Number(booking.otp_expires_at)) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }
    await query(
      `UPDATE bookings SET status = 'otp_verified', host_confirmed_connection = true, otp_verified_at = $1 WHERE id = $2`,
      [Date.now(), booking.id],
    );
    await addEvent('הספק אימת OTP וחיבור העמדה מוכן', 'activity', true);
    const updated = (await query('SELECT * FROM bookings WHERE id = $1', [booking.id])).rows[0];
    res.json({ booking: rowToBooking(updated), ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'OTP verification failed' });
  }
});

router.post('/:id/start-charge', authRequired, requireRole('driver'), async (req, res) => {
  return patchBooking(req, res, async (booking) => {
    if (booking.driver_id !== req.user.sub) throw forbidden();
    if (booking.status !== 'otp_verified') throw badRequest('Invalid status');
    if (!dbReady(req)) {
      updateBookingMem(booking.id, (row) => {
        row.status = 'charging';
        row.driver_confirmed_start = true;
        row.started_at = Date.now();
      });
      addEvent('הנהג אישר התחלת טעינה', 'activity', false);
      return;
    }
    await query(
      `UPDATE bookings SET status = 'charging', driver_confirmed_start = true, started_at = $1 WHERE id = $2`,
      [Date.now(), booking.id],
    );
    await addEvent('הנהג אישר התחלת טעינה', 'activity', true);
  });
});

router.post('/:id/finish', authRequired, requireRole('host'), async (req, res) => {
  try {
    const { kwh } = req.body || {};
    if (!dbReady(req)) {
      const booking = finishBookingMem(req.params.id, req.user.sub, kwh);
      if (!booking) return res.status(400).json({ error: 'Finish failed' });
      return res.json({ booking });
    }

    const { rows } = await query('SELECT * FROM bookings WHERE id = $1', [req.params.id]);
    const booking = rows[0];
    if (!booking) return res.status(404).json({ error: 'Not found' });
    if (booking.host_id !== req.user.sub) return res.status(403).json({ error: 'Forbidden' });
    if (booking.status !== 'charging') return res.status(400).json({ error: 'Not charging' });

    const { rows: stRows } = await query('SELECT * FROM stations WHERE id = $1', [booking.station_id]);
    const station = stRows[0];
    const settings = await getSettings(true);
    const amount = Number((Number(kwh) * Number(station.price_per_kwh)).toFixed(2));
    const platformFee = Number((amount * settings.commission / 100).toFixed(2));
    const hostShare = Number((amount - platformFee).toFixed(2));
    const now = Date.now();

    await query(
      `UPDATE bookings SET status = 'completed', completed_at = $1, kwh = $2, amount = $3, host_share = $4, platform_fee = $5 WHERE id = $6`,
      [now, kwh, amount, hostShare, platformFee, booking.id],
    );

    const txId = createId('tx');
    await query(
      `INSERT INTO transactions (id, booking_id, station_id, driver_id, host_id, amount, host_share, platform_fee, kwh, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'paid_mock',$10)`,
      [txId, booking.id, station.id, booking.driver_id, booking.host_id, amount, hostShare, platformFee, kwh, now],
    );

    await addEvent(`טעינה הסתיימה · חויב סך ₪${amount}`, 'activity', true);
    const updated = (await query('SELECT * FROM bookings WHERE id = $1', [booking.id])).rows[0];
    res.json({ booking: rowToBooking(updated) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Finish failed' });
  }
});

router.post('/:id/location', authRequired, requireRole('driver'), async (req, res) => {
  try {
    const { lat, lng } = req.body || {};
    if (lat == null || lng == null) return res.status(400).json({ error: 'Missing coordinates' });

    if (!dbReady(req)) {
      const result = updateBookingLocationMem(req.params.id, req.user.sub, { lat, lng });
      if (result.error === 'not_found') return res.status(404).json({ error: 'Not found' });
      if (result.error === 'forbidden') return res.status(403).json({ error: 'Forbidden' });
      return res.json(result);
    }

    const { rows } = await query('SELECT * FROM bookings WHERE id = $1', [req.params.id]);
    const booking = rows[0];
    if (!booking) return res.status(404).json({ error: 'Not found' });
    if (booking.driver_id !== req.user.sub) return res.status(403).json({ error: 'Forbidden' });

    const { rows: stRows } = await query('SELECT * FROM stations WHERE id = $1', [booking.station_id]);
    const station = stRows[0];
    if (!station) return res.status(404).json({ error: 'Station not found' });

    const atStation = isWithinStationGeofence(lat, lng, station.lat, station.lng);
    const now = Date.now();
    let checkInAt = booking.check_in_at ? Number(booking.check_in_at) : null;
    if (atStation && !checkInAt) checkInAt = now;

    let dwellExceeded = !!booking.dwell_exceeded;
    if (checkInAt && atStation && now > checkInAt + Number(booking.duration_hours) * 3600000) {
      dwellExceeded = true;
    }

    await query(
      `UPDATE bookings SET last_driver_lat = $1, last_driver_lng = $2, last_location_at = $3,
       check_in_at = COALESCE(check_in_at, $4), dwell_exceeded = $5 WHERE id = $6`,
      [lat, lng, now, atStation ? now : null, dwellExceeded, booking.id],
    );

    if (dwellExceeded && !booking.dwell_exceeded) {
      await addEvent(`חריגת זמן שהייה — הזמנה ${booking.id}`, 'warning', true);
    }

    const updated = (await query('SELECT * FROM bookings WHERE id = $1', [booking.id])).rows[0];
    return res.json({
      booking: rowToBooking(updated),
      atStation,
      dwellExceeded,
      distanceKm: haversineKm(Number(lat), Number(lng), Number(station.lat), Number(station.lng)),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Location update failed' });
  }
});

router.post('/:id/dispute', authRequired, async (req, res) => {
  try {
    const { reason } = req.body || {};
    if (!dbReady(req)) {
      const result = openDisputeMem(req.params.id, reason);
      if (result.error === 'not_found') return res.status(404).json({ error: 'Not found' });
      if (result.error === 'already_open') return res.status(409).json({ error: 'Dispute already open' });
      return res.status(201).json({ ok: true, id: result.id });
    }

    const { rows } = await query('SELECT * FROM bookings WHERE id = $1', [req.params.id]);
    const booking = rows[0];
    if (!booking) return res.status(404).json({ error: 'Not found' });

    const { rows: open } = await query(
      `SELECT id FROM disputes WHERE booking_id = $1 AND status = 'open'`,
      [booking.id],
    );
    if (open[0]) return res.status(409).json({ error: 'Dispute already open' });

    const id = createId('dispute');
    await query(
      `INSERT INTO disputes (id, booking_id, reason, status, created_at) VALUES ($1,$2,$3,'open',$4)`,
      [id, booking.id, reason || 'Dispute', Date.now()],
    );
    await addEvent('נפתחה מחלוקת לטיפול מנהל', 'warning', true);
    res.status(201).json({ ok: true, id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Dispute failed' });
  }
});

async function patchBooking(req, res, fn) {
  try {
    const ready = dbReady(req);
    const booking = ready
      ? (await query('SELECT * FROM bookings WHERE id = $1', [req.params.id])).rows[0]
      : getBookingRowMem(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Not found' });
    await fn(booking);
    const updated = ready
      ? rowToBooking((await query('SELECT * FROM bookings WHERE id = $1', [booking.id])).rows[0])
      : rowToBooking(getBookingRowMem(booking.id));
    res.json({ booking: updated });
  } catch (err) {
    if (err.code === 'FORBIDDEN') return res.status(403).json({ error: 'Forbidden' });
    if (err.code === 'BAD_REQUEST') return res.status(400).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: 'Action failed' });
  }
}

function forbidden() {
  const e = new Error('Forbidden');
  e.code = 'FORBIDDEN';
  throw e;
}

function badRequest(msg) {
  const e = new Error(msg);
  e.code = 'BAD_REQUEST';
  throw e;
}

export default router;
