import { Router } from 'express';
import { query } from '../db/pool.js';
import { becomeProviderMem } from '../devDataStore.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { addEvent } from '../services/stateService.js';
import { geocodeAddressIsrael, isDefaultTelAvivCoords } from '../services/geocodeService.js';
import { createId, rowToStation, rowToUser } from '../utils.js';
import { CHARGING_CATEGORY } from '../services/serviceCategories.js';

const SOS_CATEGORIES = new Set(['fuel', 'puncture', 'tow', 'garage', 'battery', 'bakery']);

const router = Router();

function dbReady(req) {
  return !!req.app.locals.dbReady;
}

function normalizeStationCategory(raw) {
  const value = String(raw || CHARGING_CATEGORY).trim();
  if (value === CHARGING_CATEGORY || SOS_CATEGORIES.has(value)) return value;
  return CHARGING_CATEGORY;
}

router.post('/me/become-provider', authRequired, requireRole('driver'), async (req, res) => {
  try {
    const {
      providerType,
      serviceCategories,
      businessName,
      stationName,
      address,
      lat,
      lng,
      power,
      plug,
      pricePerKwh,
      termsText,
    } = req.body || {};

    if (!providerType || !['sos', 'charging'].includes(providerType)) {
      return res.status(400).json({ error: 'invalid', detail: 'יש לבחור סוג ספק: sos או charging' });
    }

    if (!dbReady(req)) {
      const result = becomeProviderMem(req.user, {
        providerType,
        serviceCategories,
        businessName,
        stationName,
        address,
        lat,
        lng,
        power,
        plug,
        pricePerKwh,
        termsText,
      });
      if (result.error) return res.status(result.status || 400).json({ error: result.error, detail: result.detail });
      return res.status(201).json(result);
    }

    const { rows: userRows } = await query('SELECT * FROM users WHERE id = $1', [req.user.sub]);
    let user = userRows[0];
    if (!user && req.user.email) {
      const byEmail = await query('SELECT * FROM users WHERE email = $1', [req.user.email.toLowerCase()]);
      user = byEmail.rows[0];
    }
    if (!user || user.role !== 'driver') {
      return res.status(403).json({ error: 'forbidden', detail: 'רק לקוחות יכולים להפוך לספק' });
    }
    if (user.provider_capable) {
      return res.status(409).json({ error: 'already_provider', detail: 'כבר רשום כספק — התחברו בפורטל הספק' });
    }

    const categories = Array.isArray(serviceCategories)
      ? serviceCategories.filter((c) => SOS_CATEGORIES.has(c))
      : [];
    if (providerType === 'sos' && !categories.length) {
      return res.status(400).json({ error: 'invalid', detail: 'יש לבחור לפחות סוג שירות אחד' });
    }
    if (providerType === 'charging' && !stationName?.trim()) {
      return res.status(400).json({ error: 'invalid', detail: 'יש להזין שם עמדת טעינה' });
    }
    if (providerType === 'charging' && !address?.trim()) {
      return res.status(400).json({ error: 'invalid', detail: 'יש להזין כתובת עמדה' });
    }

    await query('UPDATE users SET provider_capable = true WHERE id = $1', [user.id]);

    const createdStations = [];
    const now = Date.now();
    const displayName = businessName?.trim() || user.name;

    if (providerType === 'sos') {
      for (const category of categories) {
        const stationId = createId('station');
        await query(
          `INSERT INTO stations
            (id, host_id, name, address, lat, lng, distance, power, plug, price_per_kwh, available, rating, photos, terms_text, service_category, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,0,0,'—',0,true,4.5,0,$7,$8,$9)`,
          [
            stationId,
            user.id,
            `${displayName} · ${category}`,
            address?.trim() || 'שירות נייד',
            Number(lat) || 31.78,
            Number(lng) || 35.22,
            'שירות חירום · לקוח שהפך לספק',
            category,
            now,
          ],
        );
        const { rows } = await query('SELECT * FROM stations WHERE id = $1', [stationId]);
        createdStations.push(rowToStation(rows[0]));
      }
    } else {
      const serviceCategory = CHARGING_CATEGORY;
      let stationLat = Number(lat);
      let stationLng = Number(lng);
      if (!Number.isFinite(stationLat) || !Number.isFinite(stationLng) || isDefaultTelAvivCoords(stationLat, stationLng)) {
        const geocoded = await geocodeAddressIsrael(address.trim());
        if (geocoded) {
          stationLat = geocoded.lat;
          stationLng = geocoded.lng;
        } else {
          stationLat = Number.isFinite(stationLat) ? stationLat : 32.08;
          stationLng = Number.isFinite(stationLng) ? stationLng : 34.78;
        }
      }
      const stationId = createId('station');
      await query(
        `INSERT INTO stations
          (id, host_id, name, address, lat, lng, distance, power, plug, price_per_kwh, available, rating, photos, terms_text, service_category, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,1,$7,$8,$9,true,4.5,0,$10,$11,$12)`,
        [
          stationId,
          user.id,
          stationName.trim(),
          address.trim(),
          stationLat,
          stationLng,
          Number(power) || 11,
          plug || 'Type 2',
          Number(pricePerKwh) || 1.25,
          termsText || 'עמדת טעינה · לקוח שהפך לספק',
          serviceCategory,
          now,
        ],
      );
      const { rows } = await query('SELECT * FROM stations WHERE id = $1', [stationId]);
      createdStations.push(rowToStation(rows[0]));
    }

    await addEvent(`${user.name} הפך לספק (${providerType})`, 'activity', true);
    const updatedUser = (await query('SELECT * FROM users WHERE id = $1', [user.id])).rows[0];
    res.status(201).json({
      user: rowToUser(updatedUser),
      stations: createdStations,
      message: 'נרשמתם כספק — התחברו בפורטל הספק עם אותו מייל',
    });
  } catch (err) {
    console.error('[become-provider]', err);
    res.status(500).json({ error: 'Failed to become provider', detail: err.message });
  }
});

export default router;
