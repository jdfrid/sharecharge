import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db/pool.js';
import { createId, createOtp, PORTAL_TO_ROLE, rowToUser } from '../utils.js';

const router = Router();

router.post('/otp/send', async (req, res) => {
  try {
    const { email, portal } = req.body || {};
    if (!email?.includes('@') || !PORTAL_TO_ROLE[portal]) {
      return res.status(400).json({ error: 'Invalid email or portal' });
    }

    const code = createOtp();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    await query(
      `INSERT INTO auth_otps (email, portal, code, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email, portal) DO UPDATE SET code = EXCLUDED.code, expires_at = EXCLUDED.expires_at`,
      [email.toLowerCase().trim(), portal, code, expiresAt],
    );

    console.log(`[OTP] ${portal} ${email} → ${code}`);

    res.json({
      ok: true,
      sentAt: Date.now(),
      devCode: process.env.NODE_ENV !== 'production' ? code : undefined,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

router.post('/otp/verify', async (req, res) => {
  try {
    const { email, portal, code } = req.body || {};
    const normalizedEmail = email?.toLowerCase()?.trim();
    if (!normalizedEmail?.includes('@') || !PORTAL_TO_ROLE[portal] || !code) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    const expectedRole = PORTAL_TO_ROLE[portal];
    const { rows: otpRows } = await query(
      'SELECT * FROM auth_otps WHERE email = $1 AND portal = $2',
      [normalizedEmail, portal],
    );
    const otpRow = otpRows[0];
    if (!otpRow || otpRow.code !== String(code).trim() || Date.now() > Number(otpRow.expires_at)) {
      return res.status(401).json({ error: 'Invalid or expired code' });
    }

    let { rows: userRows } = await query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
    let user = userRows[0];

    if (!user) {
      if (expectedRole === 'admin') {
        return res.status(403).json({ error: 'Admin account not provisioned' });
      }
      const id = createId(expectedRole === 'host' ? 'host' : 'driver');
      const name = normalizedEmail.split('@')[0];
      await query(
        `INSERT INTO users (id, name, email, role, verified, blocked, revenue, spend, created_at)
         VALUES ($1, $2, $3, $4, true, false, 0, 0, $5)`,
        [id, name, normalizedEmail, expectedRole, Date.now()],
      );
      user = (await query('SELECT * FROM users WHERE id = $1', [id])).rows[0];
    } else if (user.role !== expectedRole && expectedRole !== 'admin') {
      return res.status(403).json({ error: `Account is registered as ${user.role}, not ${expectedRole}` });
    } else if (expectedRole === 'admin' && user.role !== 'admin') {
      return res.status(403).json({ error: 'Not an admin account' });
    }

    if (user.blocked) {
      return res.status(403).json({ error: 'Account blocked' });
    }

    await query('DELETE FROM auth_otps WHERE email = $1 AND portal = $2', [normalizedEmail, portal]);

    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role, portal },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '30d' },
    );

    res.json({
      token,
      user: rowToUser(user),
      portal,
      verifiedAt: Date.now(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

router.get('/me', async (req, res) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [payload.sub]);
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ user: rowToUser(rows[0]), portal: payload.portal });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
