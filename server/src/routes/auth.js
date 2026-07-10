import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db/pool.js';
import {
  clearMemOtp,
  loadMemOtp,
  loadMemUserByEmail,
  saveMemOtp,
  saveMemUser,
} from '../devAuthStore.js';
import { createId, createOtp, PORTAL_TO_ROLE, rowToUser } from '../utils.js';
import { deliverOtp, otpDeliveryConfigured } from '../services/otpDeliveryService.js';

const router = Router();

function devOtpEnabled() {
  if (process.env.ALLOW_DEV_OTP === 'true') return true;
  if (process.env.NODE_ENV !== 'production') return true;
  if (!process.env.DATABASE_URL) return true;
  return false;
}

function respondOtp(res, { email, portal, code, delivery }) {
  console.log(`[OTP] ${portal} ${email} → ${code} (${delivery?.channel || 'console'})`);
  res.json({
    ok: true,
    sentAt: Date.now(),
    deliveryMethod: delivery?.channel || 'console',
    deliveryConfigured: otpDeliveryConfigured(),
    devCode: devOtpEnabled() ? code : undefined,
  });
}

async function persistOtp(email, portal, code, expiresAt, dbReady) {
  if (dbReady) {
    await query(
      `INSERT INTO auth_otps (email, portal, code, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email, portal) DO UPDATE SET code = EXCLUDED.code, expires_at = EXCLUDED.expires_at`,
      [email, portal, code, expiresAt],
    );
    return;
  }
  if (!devOtpEnabled()) {
    throw new Error('Database unavailable');
  }
  saveMemOtp(email, portal, code, expiresAt);
  console.warn('[OTP] saved in memory (DB unavailable)');
}

async function loadOtp(email, portal, dbReady) {
  if (dbReady) {
    const { rows } = await query('SELECT * FROM auth_otps WHERE email = $1 AND portal = $2', [email, portal]);
    return rows[0];
  }
  return loadMemOtp(email, portal);
}

async function resolveUser(normalizedEmail, expectedRole, dbReady, profile = {}) {
  if (dbReady) {
    let { rows: userRows } = await query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
    let user = userRows[0];

    if (!user) {
      if (expectedRole === 'admin') {
        throw Object.assign(new Error('Admin account not provisioned'), { status: 403 });
      }
      const id = createId(expectedRole === 'host' ? 'host' : 'driver');
      const name = profile.name || normalizedEmail.split('@')[0];
      const phone = profile.phone || null;
      await query(
        `INSERT INTO users (id, name, email, phone, role, verified, blocked, revenue, spend, created_at)
         VALUES ($1, $2, $3, $4, $5, true, false, 0, 0, $6)`,
        [id, name, normalizedEmail, phone, expectedRole, Date.now()],
      );
      user = (await query('SELECT * FROM users WHERE id = $1', [id])).rows[0];
    } else if (user.role !== expectedRole && expectedRole !== 'admin') {
      if (expectedRole === 'driver' && user.role === 'host') {
        /* host may still use client portal */
      } else if (expectedRole === 'host' && user.role === 'driver' && user.provider_capable) {
        /* driver upgraded to provider-capable */
      } else {
        throw Object.assign(new Error(`Account is registered as ${user.role}, not ${expectedRole}`), { status: 403 });
      }
    } else if (expectedRole === 'admin' && user.role !== 'admin') {
      throw Object.assign(new Error('Not an admin account'), { status: 403 });
    }

    if (user.blocked) {
      throw Object.assign(new Error('Account blocked'), { status: 403 });
    }

    return rowToUser(user);
  }

  if (!devOtpEnabled()) {
    throw new Error('Database unavailable');
  }

  let user = loadMemUserByEmail(normalizedEmail);
  if (!user && expectedRole === 'admin') {
    const adminEmails = (process.env.ADMIN_EMAILS || 'admin@sharecharge.app')
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean);
    if (adminEmails.includes(normalizedEmail)) {
      user = {
        id: 'admin-1',
        name: 'מנהל מערכת',
        email: normalizedEmail,
        role: 'admin',
        verified: true,
        blocked: false,
        revenue: 0,
        spend: 0,
        createdAt: Date.now(),
      };
      saveMemUser(user);
    }
  }
  if (!user) {
    if (expectedRole === 'admin') {
      throw Object.assign(new Error('Admin account not provisioned'), { status: 403 });
    }
    user = {
      id: createId(expectedRole === 'host' ? 'host' : 'driver'),
      name: profile.name || normalizedEmail.split('@')[0],
      email: normalizedEmail,
      phone: profile.phone || null,
      role: expectedRole,
      verified: true,
      blocked: false,
      revenue: 0,
      spend: 0,
      createdAt: Date.now(),
    };
    saveMemUser(user);
  }
  return user;
}

async function clearOtp(email, portal, dbReady) {
  if (dbReady) {
    await query('DELETE FROM auth_otps WHERE email = $1 AND portal = $2', [email, portal]);
    return;
  }
  clearMemOtp(email, portal);
}

router.post('/register', async (req, res) => {
  try {
    const {
      email,
      portal,
      name,
      phone,
      businessName,
      serviceCategory,
      stationAddress,
      lat,
      lng,
    } = req.body || {};
    const normalizedEmail = email?.toLowerCase()?.trim();
    if (!normalizedEmail?.includes('@') || !PORTAL_TO_ROLE[portal] || !name?.trim()) {
      return res.status(400).json({ error: 'Invalid registration payload' });
    }
    if (portal === 'system') {
      return res.status(403).json({ error: 'Admin accounts must be provisioned by ops' });
    }

    const expectedRole = PORTAL_TO_ROLE[portal];
    const dbReady = !!req.app.locals.dbReady;

    if (dbReady) {
      const { rows: existing } = await query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
      if (existing[0] && existing[0].role !== expectedRole) {
        return res.status(403).json({ error: `Account exists as ${existing[0].role}` });
      }
      if (!existing[0]) {
        const id = createId(expectedRole === 'host' ? 'host' : 'driver');
        await query(
          `INSERT INTO users (id, name, email, phone, role, verified, blocked, revenue, spend, created_at)
           VALUES ($1, $2, $3, $4, $5, false, false, 0, 0, $6)`,
          [id, name.trim(), normalizedEmail, phone || null, expectedRole, Date.now()],
        );
      } else {
        await query('UPDATE users SET name = $1, phone = COALESCE($2, phone) WHERE email = $3', [
          name.trim(),
          phone || null,
          normalizedEmail,
        ]);
      }

      if (expectedRole === 'host' && serviceCategory && stationAddress) {
        const hostRow = (await query('SELECT id FROM users WHERE email = $1', [normalizedEmail])).rows[0];
        const stationId = createId('station');
        await query(
          `INSERT INTO stations
            (id, host_id, name, address, lat, lng, distance, power, plug, price_per_kwh, available, rating, photos, terms_text, service_category, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,0,0,'—',0,true,4.5,0,$7,$8,$9)`,
          [
            stationId,
            hostRow.id,
            businessName || name.trim(),
            stationAddress,
            Number(lat) || 31.78,
            Number(lng) || 35.22,
            'שירות חירום · נרשם באפליקציה',
            serviceCategory,
            Date.now(),
          ],
        );
      }
    } else if (devOtpEnabled()) {
      saveMemUser({
        id: createId(expectedRole === 'host' ? 'host' : 'driver'),
        name: name.trim(),
        email: normalizedEmail,
        phone: phone || null,
        role: expectedRole,
        verified: false,
        blocked: false,
        revenue: 0,
        spend: 0,
        createdAt: Date.now(),
      });
    } else {
      return res.status(503).json({ error: 'Database unavailable' });
    }

    const code = createOtp();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    await persistOtp(normalizedEmail, portal, code, expiresAt, dbReady);
    const delivery = await deliverOtp({ email: normalizedEmail, portal, code });
    respondOtp(res, { email: normalizedEmail, portal, code, delivery });
  } catch (err) {
    console.error('[register]', err);
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

router.post('/otp/send', async (req, res) => {
  try {
    const { email, portal } = req.body || {};
    const normalizedEmail = email?.toLowerCase()?.trim();
    if (!normalizedEmail?.includes('@') || !PORTAL_TO_ROLE[portal]) {
      return res.status(400).json({ error: 'Invalid email or portal' });
    }

    const code = createOtp();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    const dbReady = !!req.app.locals.dbReady;

    try {
      await persistOtp(normalizedEmail, portal, code, expiresAt, dbReady);
    } catch (err) {
      if (!devOtpEnabled()) throw err;
      saveMemOtp(normalizedEmail, portal, code, expiresAt);
      console.warn('[OTP send] DB failed, using memory:', err.message);
    }

    respondOtp(res, { email: normalizedEmail, portal, code, delivery: await deliverOtp({ email: normalizedEmail, portal, code }) });
  } catch (err) {
    console.error('[OTP send]', err);
    res.status(500).json({
      error: 'Failed to send OTP',
      detail: devOtpEnabled() ? err.message : undefined,
    });
  }
});

router.post('/otp/verify', async (req, res) => {
  try {
    const { email, portal, code } = req.body || {};
    const normalizedEmail = email?.toLowerCase()?.trim();
    if (!normalizedEmail?.includes('@') || !PORTAL_TO_ROLE[portal] || !code) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    const dbReady = !!req.app.locals.dbReady;
    const otpRow = await loadOtp(normalizedEmail, portal, dbReady);
    if (!otpRow || otpRow.code !== String(code).trim() || Date.now() > Number(otpRow.expires_at)) {
      return res.status(401).json({ error: 'Invalid or expired code' });
    }

    const user = await resolveUser(normalizedEmail, PORTAL_TO_ROLE[portal], dbReady);
    if (dbReady) {
      await query('UPDATE users SET verified = true WHERE id = $1', [user.id]);
    }
    await clearOtp(normalizedEmail, portal, dbReady);

    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        portal,
        providerCapable: user.provider_capable === true || user.providerCapable === true,
      },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '30d' },
    );

    res.json({
      token,
      user,
      portal,
      verifiedAt: Date.now(),
    });
  } catch (err) {
    console.error('[OTP verify]', err);
    const status = err.status || 500;
    res.status(status).json({
      error: err.message || 'Verification failed',
      detail: devOtpEnabled() ? err.message : undefined,
    });
  }
});

router.get('/me', async (req, res) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    if (req.app.locals.dbReady) {
      const { rows } = await query('SELECT * FROM users WHERE id = $1', [payload.sub]);
      if (!rows[0]) return res.status(404).json({ error: 'User not found' });
      return res.json({ user: rowToUser(rows[0]), portal: payload.portal });
    }
    const user = loadMemUserByEmail(payload.email);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user, portal: payload.portal });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
