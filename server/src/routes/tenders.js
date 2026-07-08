import { Router } from 'express';
import { query } from '../db/pool.js';
import {
  acceptBidMem,
  completeTenderMem,
  confirmBidMem,
  counterBidMem,
  createTenderMem,
  declineBidMem,
  listOpenTendersMem,
  listTenderBidsMem,
  reviseBidMem,
  submitBidMem,
  updateTenderLocationMem,
} from '../devDataStore.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { addEvent, getSettings, loadFullState } from '../services/stateService.js';
import { findProvidersInRadius, summarizeEmergencyNotify } from '../services/emergencyNotifyService.js';
import { createId, rowToServiceBid, rowToServiceRequest } from '../utils.js';

const router = Router();

function dbReady(req) {
  return !!req.app.locals.dbReady;
}

router.post('/', authRequired, requireRole('driver'), async (req, res) => {
  try {
    const {
      category,
      lat,
      lng,
      addressText,
      vehicleProfile,
      problemDescription,
      phone,
      notifyRadiusKm,
    } = req.body || {};
    if (!category || lat == null || lng == null) {
      return res.status(400).json({ error: 'invalid', detail: 'category, lat, lng required' });
    }
    const radius = Number(notifyRadiusKm || 50);

    if (!dbReady(req)) {
      const result = createTenderMem(req.user, {
        category,
        lat,
        lng,
        addressText,
        vehicleProfile,
        problemDescription,
        phone,
        notifyRadiusKm: radius,
      });
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.status(201).json(result);
    }

    const id = createId('tender');
    const now = Date.now();
    await query(
      `INSERT INTO service_requests
        (id, driver_id, category, lat, lng, address_text, problem_description, phone, notify_radius_km, vehicle_profile, status, expires_at, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'open',$11,$12)`,
      [
        id,
        req.user.sub,
        category,
        Number(lat),
        Number(lng),
        addressText || '',
        problemDescription || '',
        phone || '',
        radius,
        JSON.stringify(vehicleProfile || {}),
        now + 30 * 60 * 1000,
        now,
      ],
    );

    const state = await loadFullState(true);
    const providers = findProvidersInRadius({
      stations: state.stations,
      users: state.users,
      lat: Number(lat),
      lng: Number(lng),
      radiusKm: radius,
    });
    const notify = summarizeEmergencyNotify({ providers, radiusKm: radius, category });

    await addEvent(
      `קריאת חירום (${category}) · ${notify.notifiedCount} ספקי חירום ב-${radius} ק״מ`,
      'activity',
      true,
    );
    const { rows } = await query('SELECT * FROM service_requests WHERE id = $1', [id]);
    res.status(201).json({ request: rowToServiceRequest(rows[0]), notify });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create tender' });
  }
});

router.get('/open', authRequired, requireRole('host'), async (req, res) => {
  try {
    if (!dbReady(req)) {
      const result = listOpenTendersMem(req.user);
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result);
    }
    const { rows } = await query("SELECT * FROM service_requests WHERE status = 'open' ORDER BY created_at DESC");
    res.json({ requests: rows.map(rowToServiceRequest) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list tenders' });
  }
});

router.get('/:id/bids', authRequired, async (req, res) => {
  try {
    if (!dbReady(req)) {
      const result = listTenderBidsMem(req.params.id, req.user);
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result);
    }

    const { rows: reqRows } = await query('SELECT * FROM service_requests WHERE id = $1', [req.params.id]);
    const request = reqRows[0];
    if (!request) return res.status(404).json({ error: 'not_found' });
    if (req.user.role === 'driver' && request.driver_id !== req.user.sub) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const { rows } = await query(
      "SELECT * FROM service_bids WHERE request_id = $1 AND status = 'pending' ORDER BY total ASC",
      [req.params.id],
    );
    res.json({ request: rowToServiceRequest(request), bids: rows.map(rowToServiceBid) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load bids' });
  }
});

router.post('/:id/bids', authRequired, requireRole('host'), async (req, res) => {
  try {
    const { lineItems, total, etaMinutes } = req.body || {};
    if (!dbReady(req)) {
      const result = submitBidMem(req.user, req.params.id, { lineItems, total, etaMinutes });
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.status(201).json(result);
    }

    const { rows: reqRows } = await query('SELECT * FROM service_requests WHERE id = $1', [req.params.id]);
    if (!reqRows[0] || reqRows[0].status !== 'open') {
      return res.status(404).json({ error: 'not_found' });
    }

    const items = lineItems || [];
    const sum = Number(total ?? items.reduce((s, l) => s + Number(l.amount || 0), 0));
    const id = createId('bid');
    await query(
      `INSERT INTO service_bids (id, request_id, host_id, line_items, total, eta_minutes, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,'pending',$7)`,
      [id, req.params.id, req.user.sub, JSON.stringify(items), sum, Number(etaMinutes || 15), Date.now()],
    );
    const { rows } = await query('SELECT * FROM service_bids WHERE id = $1', [id]);
    res.status(201).json({ bid: rowToServiceBid(rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit bid' });
  }
});

router.post('/:id/accept/:bidId', authRequired, requireRole('driver'), async (req, res) => {
  try {
    if (!dbReady(req)) {
      const result = acceptBidMem(req.user, req.params.id, req.params.bidId);
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result);
    }

    const { rows: reqRows } = await query('SELECT * FROM service_requests WHERE id = $1', [req.params.id]);
    const request = reqRows[0];
    if (!request || request.driver_id !== req.user.sub) {
      return res.status(404).json({ error: 'not_found' });
    }

    const { rows: bidRows } = await query('SELECT * FROM service_bids WHERE id = $1 AND request_id = $2', [
      req.params.bidId,
      req.params.id,
    ]);
    const bid = bidRows[0];
    if (!bid) return res.status(404).json({ error: 'not_found' });

    await query(
      `UPDATE service_requests SET status = 'pending_provider', accepted_bid_id = $1, host_id = $2, amount = $3 WHERE id = $4`,
      [bid.id, bid.host_id, bid.total, req.params.id],
    );
    await query("UPDATE service_bids SET status = 'accepted' WHERE id = $1", [bid.id]);
    await query("UPDATE service_bids SET status = 'rejected' WHERE request_id = $1 AND id <> $2", [
      req.params.id,
      bid.id,
    ]);
    await addEvent('נהג בחר הצעה — ממתין לאישור ספק', 'activity', true);

    const { rows } = await query('SELECT * FROM service_requests WHERE id = $1', [req.params.id]);
    res.json({ request: rowToServiceRequest(rows[0]), bid: rowToServiceBid(bid) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to accept bid' });
  }
});

router.post('/:id/confirm', authRequired, requireRole('host'), async (req, res) => {
  try {
    if (!dbReady(req)) {
      const result = confirmBidMem(req.user, req.params.id);
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result);
    }

    const { rows: reqRows } = await query('SELECT * FROM service_requests WHERE id = $1', [req.params.id]);
    const request = reqRows[0];
    if (!request || request.host_id !== req.user.sub || request.status !== 'pending_provider') {
      return res.status(404).json({ error: 'not_found' });
    }

    await query("UPDATE service_requests SET status = 'assigned' WHERE id = $1", [req.params.id]);
    await addEvent('ספק אישר את ההצעה — השירות יוצא לדרך', 'activity', true);
    const { rows } = await query('SELECT * FROM service_requests WHERE id = $1', [req.params.id]);
    res.json({ request: rowToServiceRequest(rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to confirm tender' });
  }
});

router.post('/:id/decline', authRequired, requireRole('host'), async (req, res) => {
  try {
    if (!dbReady(req)) {
      const result = declineBidMem(req.user, req.params.id);
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result);
    }

    const { rows: reqRows } = await query('SELECT * FROM service_requests WHERE id = $1', [req.params.id]);
    const request = reqRows[0];
    if (!request || request.host_id !== req.user.sub || request.status !== 'pending_provider') {
      return res.status(404).json({ error: 'not_found' });
    }

    const bidId = request.accepted_bid_id;
    await query(
      `UPDATE service_requests SET status = 'open', accepted_bid_id = NULL, host_id = NULL, amount = 0 WHERE id = $1`,
      [req.params.id],
    );
    if (bidId) {
      await query("UPDATE service_bids SET status = 'pending' WHERE id = $1", [bidId]);
    }
    await addEvent('ספק דחה את ההצעה — הקריאה נשארת פתוחה', 'activity', true);
    const { rows } = await query('SELECT * FROM service_requests WHERE id = $1', [req.params.id]);
    res.json({ request: rowToServiceRequest(rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to decline tender' });
  }
});

router.post('/:id/location', authRequired, async (req, res) => {
  try {
    const { lat, lng, role } = req.body || {};
    if (lat == null || lng == null) return res.status(400).json({ error: 'invalid' });

    if (!dbReady(req)) {
      const result = updateTenderLocationMem(req.params.id, req.user, { lat, lng, role });
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result);
    }

    const { rows } = await query('SELECT * FROM service_requests WHERE id = $1', [req.params.id]);
    const request = rows[0];
    if (!request) return res.status(404).json({ error: 'not_found' });

    if (role === 'provider' && req.user.sub === request.host_id) {
      await query(
        "UPDATE service_requests SET provider_lat = $1, provider_lng = $2, status = 'in_progress' WHERE id = $3",
        [lat, lng, req.params.id],
      );
    } else if (role === 'driver' && req.user.sub === request.driver_id) {
      await query('UPDATE service_requests SET lat = $1, lng = $2 WHERE id = $3', [lat, lng, req.params.id]);
    } else {
      return res.status(403).json({ error: 'forbidden' });
    }

    const updated = await query('SELECT * FROM service_requests WHERE id = $1', [req.params.id]);
    res.json({ request: rowToServiceRequest(updated.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

router.post('/:id/bids/:bidId/counter', authRequired, requireRole('driver'), async (req, res) => {
  try {
    const { total, etaMinutes, message } = req.body || {};
    if (!dbReady(req)) {
      const result = counterBidMem(req.user, req.params.id, req.params.bidId, { total, etaMinutes, message });
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result);
    }

    const { rows: reqRows } = await query('SELECT * FROM service_requests WHERE id = $1', [req.params.id]);
    const request = reqRows[0];
    if (!request || request.driver_id !== req.user.sub || request.status !== 'open') {
      return res.status(404).json({ error: 'not_found' });
    }

    const { rows: bidRows } = await query('SELECT * FROM service_bids WHERE id = $1 AND request_id = $2', [
      req.params.bidId,
      req.params.id,
    ]);
    if (!bidRows[0] || bidRows[0].status !== 'pending') {
      return res.status(404).json({ error: 'not_found' });
    }

    await query(
      `UPDATE service_bids SET driver_counter_total = $1, driver_counter_eta_minutes = $2, driver_counter_message = $3, driver_counter_at = $4 WHERE id = $5`,
      [Number(total), Number(etaMinutes || 15), message || '', Date.now(), req.params.bidId],
    );
    await addEvent('נהג שלח הצעה נגדית על מחיר וזמן', 'activity', true);
    const bid = (await query('SELECT * FROM service_bids WHERE id = $1', [req.params.bidId])).rows[0];
    res.json({ bid: rowToServiceBid(bid) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Counter offer failed' });
  }
});

router.post('/:id/bids/:bidId/revise', authRequired, requireRole('host'), async (req, res) => {
  try {
    const { total, etaMinutes } = req.body || {};
    if (!dbReady(req)) {
      const result = reviseBidMem(req.user, req.params.id, req.params.bidId, { total, etaMinutes });
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result);
    }

    const { rows: bidRows } = await query(
      'SELECT * FROM service_bids WHERE id = $1 AND request_id = $2 AND host_id = $3',
      [req.params.bidId, req.params.id, req.user.sub],
    );
    if (!bidRows[0] || bidRows[0].status !== 'pending') {
      return res.status(404).json({ error: 'not_found' });
    }

    await query(
      `UPDATE service_bids SET total = $1, eta_minutes = $2,
       driver_counter_total = NULL, driver_counter_eta_minutes = NULL, driver_counter_message = NULL, driver_counter_at = NULL
       WHERE id = $3`,
      [Number(total), Number(etaMinutes || 15), req.params.bidId],
    );
    await addEvent('ספק עדכן הצעה לאחר משא ומתן', 'activity', true);
    const bid = (await query('SELECT * FROM service_bids WHERE id = $1', [req.params.bidId])).rows[0];
    res.json({ bid: rowToServiceBid(bid) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Revise bid failed' });
  }
});

router.post('/:id/complete', authRequired, requireRole('host'), async (req, res) => {
  try {
    if (!dbReady(req)) {
      const result = completeTenderMem(req.user, req.params.id);
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result);
    }

    const { rows } = await query('SELECT * FROM service_requests WHERE id = $1', [req.params.id]);
    const request = rows[0];
    if (!request || request.host_id !== req.user.sub) {
      return res.status(404).json({ error: 'not_found' });
    }

    const settings = await getSettings(true);
    const amount = Number(request.amount || 0);
    const platformFee = Number((amount * settings.commission / 100).toFixed(2));
    const hostShare = Number((amount - platformFee).toFixed(2));
    const now = Date.now();

    await query("UPDATE service_requests SET status = 'completed', completed_at = $1 WHERE id = $2", [
      now,
      req.params.id,
    ]);
    await query(
      `INSERT INTO transactions (id, booking_id, station_id, driver_id, host_id, amount, host_share, platform_fee, kwh, status, created_at)
       VALUES ($1,NULL,NULL,$2,$3,$4,$5,$6,0,'paid_mock',$7)`,
      [createId('tx'), request.driver_id, request.host_id, amount, hostShare, platformFee, now],
    );

    const updated = await query('SELECT * FROM service_requests WHERE id = $1', [req.params.id]);
    res.json({ request: rowToServiceRequest(updated.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to complete tender' });
  }
});

export default router;
