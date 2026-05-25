import { Router } from 'express';
import { query } from '../db/pool.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { addEvent } from '../services/stateService.js';
import { rowToStation } from '../utils.js';

const router = Router();

router.get('/', authRequired, async (req, res) => {
  try {
    const { lat, lng, radius = 50, q } = req.query;
    let sql = 'SELECT * FROM stations WHERE available = true';
    const params = [];

    if (q) {
      params.push(`%${q}%`);
      sql += ` AND (name ILIKE $${params.length} OR address ILIKE $${params.length} OR plug ILIKE $${params.length})`;
    }

    sql += ' ORDER BY distance ASC';
    const { rows } = await query(sql, params);
    let stations = rows.map(rowToStation);

    if (lat && lng) {
      const la = Number(lat);
      const ln = Number(lng);
      const r = Number(radius);
      stations = stations
        .map((s) => ({
          ...s,
          distance: haversineKm(la, ln, s.lat, s.lng),
        }))
        .filter((s) => s.distance <= r)
        .sort((a, b) => a.distance - b.distance);
    }

    res.json({ stations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load stations' });
  }
});

router.patch('/:id', authRequired, requireRole('host', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const patch = req.body || {};
    const { rows: existing } = await query('SELECT * FROM stations WHERE id = $1', [id]);
    if (!existing[0]) return res.status(404).json({ error: 'Station not found' });
    if (req.user.role === 'host' && existing[0].host_id !== req.user.sub) {
      return res.status(403).json({ error: 'Not your station' });
    }

    const fields = [];
    const values = [];
    const map = {
      name: 'name',
      address: 'address',
      power: 'power',
      plug: 'plug',
      pricePerKwh: 'price_per_kwh',
      available: 'available',
      termsText: 'terms_text',
      lat: 'lat',
      lng: 'lng',
      distance: 'distance',
    };

    for (const [key, col] of Object.entries(map)) {
      if (patch[key] !== undefined) {
        values.push(patch[key]);
        fields.push(`${col} = $${values.length}`);
      }
    }

    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
    values.push(id);
    await query(`UPDATE stations SET ${fields.join(', ')} WHERE id = $${values.length}`, values);
    await addEvent('הספק עדכן פרטי עמדה');
    const { rows } = await query('SELECT * FROM stations WHERE id = $1', [id]);
    res.json({ station: rowToStation(rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Update failed' });
  }
});

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default router;
