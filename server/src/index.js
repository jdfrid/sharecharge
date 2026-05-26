import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import stationRoutes from './routes/stations.js';
import bookingRoutes from './routes/bookings.js';
import opsRoutes from './routes/ops.js';
import { migrate } from './db/migrate.js';
import { seed } from './db/seed.js';
import { query } from './db/pool.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');
const hasPublic = fs.existsSync(path.join(publicDir, 'index.html'));

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.locals.dbReady = false;

const origins = (process.env.CORS_ORIGINS || 'http://localhost:5173,capacitor://localhost')
  .split(',')
  .map((s) => s.trim());

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || origins.includes(origin) || origin.startsWith('http://localhost')) {
        cb(null, true);
      } else {
        cb(null, true);
      }
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '2mb' }));

app.get('/', (_req, res) => {
  res.json({
    ok: true,
    service: 'sharecharge-api',
    health: '/api/health',
    api: '/api/sharecharge',
  });
});

app.get('/api/health', async (_req, res) => {
  const payload = {
    ok: true,
    service: 'sharecharge-api',
    port: PORT,
    db: app.locals.dbReady,
  };

  if (!process.env.DATABASE_URL) {
    return res.json({
      ...payload,
      db: false,
      dbError: 'DATABASE_URL missing — link sharecharge-db in Render Environment',
      otpFallback: process.env.ALLOW_DEV_OTP === 'true',
    });
  }

  if (!app.locals.dbReady) {
    return res.json({
      ...payload,
      db: false,
      dbError: 'Database not initialized — check Render Logs for migrate/seed errors',
      otpFallback: process.env.ALLOW_DEV_OTP === 'true',
    });
  }

  try {
    await query('SELECT 1 AS ok');
    const { rows } = await query(
      "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'auth_otps') AS ready",
    );
    return res.json({ ...payload, db: true, authOtpsTable: rows[0]?.ready === true });
  } catch (err) {
    return res.json({ ...payload, db: false, dbError: err.message || 'Database unavailable' });
  }
});

app.get('/api/health/db', async (_req, res) => {
  const health = await fetchHealthPayload();
  if (!health.db) return res.status(503).json({ ok: false, error: health.dbError || 'Database unavailable' });
  return res.json({ ok: true, db: true, authOtpsTable: health.authOtpsTable === true });
});

async function fetchHealthPayload() {
  if (!process.env.DATABASE_URL) {
    return { db: false, dbError: 'DATABASE_URL is not set' };
  }
  if (!app.locals.dbReady) {
    return { db: false, dbError: 'Database not initialized' };
  }
  try {
    await query('SELECT 1 AS ok');
    const { rows } = await query(
      "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'auth_otps') AS ready",
    );
    return { db: true, authOtpsTable: rows[0]?.ready === true };
  } catch (err) {
    return { db: false, dbError: err.message || 'Database unavailable' };
  }
}

app.use('/api/sharecharge/auth', authRoutes);
app.use('/api/sharecharge/stations', stationRoutes);
app.use('/api/sharecharge/bookings', bookingRoutes);
app.use('/api/sharecharge/ops', opsRoutes);

if (hasPublic) {
  app.use(express.static(publicDir, { index: false }));
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

async function boot() {
  if (!process.env.DATABASE_URL) {
    console.warn('DATABASE_URL not set — link sharecharge-db in Render Environment.');
    if (process.env.ALLOW_DEV_OTP !== 'false') {
      process.env.ALLOW_DEV_OTP = 'true';
      console.warn('In-memory OTP enabled until DATABASE_URL is linked.');
    }
  }

  if (process.env.DATABASE_URL && process.env.AUTO_MIGRATE !== 'false') {
    try {
      await migrate();
      if (process.env.AUTO_SEED !== 'false') {
        await seed();
      }
      app.locals.dbReady = true;
      console.log('Database ready.');
    } catch (err) {
      console.error('DB migrate/seed failed:', err.message);
      if (process.env.ALLOW_DEV_OTP !== 'true' && process.env.ALLOW_DEV_OTP !== 'false') {
        process.env.ALLOW_DEV_OTP = 'true';
        console.warn('In-memory OTP enabled after migrate failure.');
      } else if (process.env.ALLOW_DEV_OTP !== 'true') {
        throw err;
      } else {
        console.warn('Continuing with in-memory OTP fallback (ALLOW_DEV_OTP=true).');
      }
    }
  } else if (!process.env.DATABASE_URL) {
    /* already warned above */
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ShareCharge API listening on http://0.0.0.0:${PORT} (dbReady=${app.locals.dbReady})`);
  });
}

boot().catch((err) => {
  console.error('Boot failed:', err);
  process.exit(1);
});
