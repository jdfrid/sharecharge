import { Router } from 'express';
import { query } from '../db/pool.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { addEvent, loadFullState } from '../services/stateService.js';
import { geocodeAddressIsrael, isDefaultTelAvivCoords } from '../services/geocodeService.js';
import { createId, rowToStation, rowToUser } from '../utils.js';
import { CHARGING_CATEGORY } from '../services/serviceCategories.js';

const SOS_CATEGORIES = new Set(['fuel', 'puncture', 'tow', 'garage', 'battery', 'bakery']);

function normalizeStationCategory(raw) {
  const value = String(raw || CHARGING_CATEGORY).trim();
  if (value === CHARGING_CATEGORY || SOS_CATEGORIES.has(value)) return value;
  return CHARGING_CATEGORY;
}

const router = Router();

router.get('/state', authRequired, async (req, res) => {
  try {
    const state = await loadFullState(!!req.app.locals.dbReady);
    res.json(state);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load state' });
  }
});

router.post('/reset', authRequired, requireRole('admin'), async (req, res) => {
  try {
    await query('DELETE FROM transactions');
    await query('DELETE FROM disputes');
    await query('DELETE FROM bookings');
    await query('DELETE FROM audit_events');
    await addEvent('מנהל איפס נתוני הזמנות', 'system');
    res.json({ ok: true, state: await loadFullState() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Reset failed' });
  }
});

router.post('/users/host', authRequired, requireRole('admin'), async (req, res) => {
  try {
    const { name, email } = req.body || {};
    if (!name?.trim() || !email?.includes('@')) return res.status(400).json({ error: 'Invalid host data' });
    const id = createId('host');
    await query(
      `INSERT INTO users (id, name, email, role, verified, blocked, revenue, spend, created_at)
       VALUES ($1,$2,$3,'host',true,false,0,0,$4)`,
      [id, name.trim(), email.toLowerCase().trim(), Date.now()],
    );
    await addEvent(`מנהל הוסיף ספק חדש: ${name}`);
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
    res.status(201).json({ user: rowToUser(rows[0]) });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email exists' });
    console.error(err);
    res.status(500).json({ error: 'Failed to add host' });
  }
});

router.post('/users/driver', authRequired, requireRole('admin'), async (req, res) => {
  try {
    const { name, email } = req.body || {};
    if (!name?.trim() || !email?.includes('@')) return res.status(400).json({ error: 'Invalid driver data' });
    const id = createId('driver');
    await query(
      `INSERT INTO users (id, name, email, role, verified, blocked, revenue, spend, created_at)
       VALUES ($1,$2,$3,'driver',true,false,0,0,$4)`,
      [id, name.trim(), email.toLowerCase().trim(), Date.now()],
    );
    await addEvent(`מנהל הוסיף לקוח: ${name}`);
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
    res.status(201).json({ user: rowToUser(rows[0]) });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email exists' });
    console.error(err);
    res.status(500).json({ error: 'Failed to add driver' });
  }
});

router.post('/stations', authRequired, requireRole('admin'), async (req, res) => {
  try {
    const d = req.body || {};
    if (!d.name?.trim() || !d.address?.trim() || !d.hostId) {
      return res.status(400).json({ error: 'Invalid station data' });
    }
    const id = createId('station');
    const serviceCategory = normalizeStationCategory(d.serviceCategory);
    const isSos = serviceCategory !== CHARGING_CATEGORY;
    let lat = Number(d.lat);
    let lng = Number(d.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || isDefaultTelAvivCoords(lat, lng)) {
      const geocoded = await geocodeAddressIsrael(d.address.trim());
      if (geocoded) {
        lat = geocoded.lat;
        lng = geocoded.lng;
      } else {
        lat = Number.isFinite(lat) ? lat : 32.08;
        lng = Number.isFinite(lng) ? lng : 34.78;
      }
    }
    await query(
      `INSERT INTO stations (id, host_id, name, address, lat, lng, distance, power, plug, price_per_kwh, available, rating, photos, terms_text, service_category, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,5,0,$11,$12,$13)`,
      [
        id,
        d.hostId,
        d.name.trim(),
        d.address.trim(),
        lat,
        lng,
        Number(d.distance) || 1,
        isSos ? 0 : Number(d.power) || 22,
        isSos ? '—' : d.plug || 'Type 2',
        isSos ? 0 : Number(d.pricePerKwh) || 1.35,
        d.termsText || (isSos ? 'שירות חירום · נוסף על ידי מנהל' : ''),
        serviceCategory,
        Date.now(),
      ],
    );
    await addEvent(`מנהל הוסיף ${isSos ? 'נקודת SOS' : 'עמדה'}: ${d.name}`);
    const { rows } = await query('SELECT * FROM stations WHERE id = $1', [id]);
    res.status(201).json({ station: rowToStation(rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add station' });
  }
});

router.post('/disputes/:id/resolve', authRequired, requireRole('admin'), async (req, res) => {
  try {
    await query(`UPDATE disputes SET status = 'resolved', resolved_at = $1 WHERE id = $2`, [
      Date.now(),
      req.params.id,
    ]);
    await addEvent('מנהל סגר מחלוקת');
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Resolve failed' });
  }
});

router.post('/users/:id/toggle-block', authRequired, requireRole('admin'), async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    const blocked = !rows[0].blocked;
    await query('UPDATE users SET blocked = $1 WHERE id = $2', [blocked, req.params.id]);
    await addEvent(`${rows[0].name} ${blocked ? 'נחסם' : 'שוחרר מחסימה'}`, 'security');
    res.json({ ok: true, blocked });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Toggle block failed' });
  }
});

router.patch('/settings/commission', authRequired, requireRole('admin'), async (req, res) => {
  try {
    const commission = Number(req.body?.commission);
    if (Number.isNaN(commission)) return res.status(400).json({ error: 'Invalid commission' });
    await query('UPDATE settings SET commission = $1 WHERE id = 1', [commission]);
    await addEvent(`עמלת המיזם עודכנה ל-${commission}%`);
    res.json({ ok: true, commission });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Update failed' });
  }
});

export default router;
