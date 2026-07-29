import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import stationRoutes from './routes/stations.js';
import bookingRoutes from './routes/bookings.js';
import tenderRoutes from './routes/tenders.js';
import geoRoutes from './routes/geo.js';
import paymentRoutes from './routes/payments.js';
import opsRoutes from './routes/ops.js';
import { createDownloadsRouter, isPublishedApk } from './routes/downloads.js';
import { migrate } from './db/migrate.js';
import { seed } from './db/seed.js';
import { query } from './db/pool.js';
import { initMemDataStore } from './devDataStore.js';

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

app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  next();
});

app.get('/api', (_req, res) => {
  res.json({
    ok: true,
    service: 'sharecharge-api',
    health: '/api/health',
    sharecharge: '/api/sharecharge',
    spa: hasPublic,
  });
});

app.get('/api/health', async (_req, res) => {
  const payload = {
    ok: true,
    service: 'sharecharge-api',
    port: PORT,
    db: app.locals.dbReady,
    spa: hasPublic,
    publicDir: hasPublic ? publicDir : null,
  };

  if (!process.env.DATABASE_URL) {
    return res.json({
      ...payload,
      db: false,
      dbError: 'DATABASE_URL missing — link sharecharge-db in Render Environment',
      otpFallback: process.env.ALLOW_DEV_OTP === 'true',
      dataFallback: !app.locals.dbReady,
    });
  }

  if (!app.locals.dbReady) {
    return res.json({
      ...payload,
      db: false,
      dbError:
        app.locals.dbError ||
        'Database not initialized — check Render Logs for migrate/seed errors',
      otpFallback: process.env.ALLOW_DEV_OTP === 'true',
      dataFallback: true,
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
app.use('/api/sharecharge/users', userRoutes);
app.use('/api/sharecharge/stations', stationRoutes);
app.use('/api/sharecharge/bookings', bookingRoutes);
app.use('/api/sharecharge/tenders', tenderRoutes);
app.use('/api/sharecharge/geo', geoRoutes);
app.use('/api/sharecharge/payments', paymentRoutes);
app.use('/api/sharecharge/ops', opsRoutes);

function sendPublicPage(pageName) {
  return (_req, res) => {
    const filePath = path.join(publicDir, pageName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).type('text/plain; charset=utf-8').send('העמוד לא נמצא — יש לפרוס גרסה עדכנית');
    }
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.sendFile(filePath);
  };
}

if (hasPublic) {
  app.use('/api/downloads', createDownloadsRouter(publicDir));
  app.get('/download', sendPublicPage('download.html'));
  app.get('/download.html', sendPublicPage('download.html'));
  app.get('/privacy', sendPublicPage('privacy.html'));
  app.get('/privacy.html', sendPublicPage('privacy.html'));
}

app.use('/api', (req, res) => {
  res.status(404).json({
    error: 'not_found',
    detail: `API route ${req.method} ${req.path} not found — deploy latest server on Render`,
  });
});

if (hasPublic) {
  app.get('/downloads/:filename', (req, res, next) => {
    const { filename } = req.params;
    if (!filename.endsWith('.apk')) return next();
    if (!isPublishedApk(filename)) {
      return res.status(404).type('text/plain; charset=utf-8').send('קובץ לא מפורסם להורדה');
    }
    const filePath = path.join(publicDir, 'downloads', filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).type('text/plain; charset=utf-8').send('קובץ לא נמצא');
    }
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.sendFile(filePath);
  });

  app.use(
    express.static(publicDir, {
      index: 'index.html',
      maxAge: '1h',
      setHeaders(res, filePath) {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
        if (filePath.endsWith('.apk')) {
          res.setHeader('Content-Type', 'application/vnd.android.package-archive');
          res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
          res.setHeader('Cache-Control', 'public, max-age=3600');
        }
      },
    }),
  );
  app.get(/^\/(?!api\/)(?!download(?:\.html)?$)(?!privacy(?:\.html)?$)(?!downloads\/).*/, (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(publicDir, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      ok: true,
      service: 'sharecharge-api',
      health: '/api/health',
      api: '/api/sharecharge',
      hint: 'Frontend not bundled — run: npm run build:deploy',
    });
  });
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function initDatabase() {
  if (!process.env.DATABASE_URL || process.env.AUTO_MIGRATE === 'false') return;

  const maxAttempts = Number(process.env.DB_BOOT_RETRIES) || 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await migrate();
      app.locals.dbReady = true;
      app.locals.dbError = null;
      console.log('Database migrations applied.');

      if (process.env.AUTO_SEED !== 'false') {
        try {
          await seed();
          console.log('Seed data applied.');
        } catch (seedErr) {
          app.locals.dbSeedError = seedErr.message;
          console.error('DB seed failed (API still uses DB):', seedErr.message);
        }
      }
      console.log('Database ready.');
      return;
    } catch (err) {
      app.locals.dbError = err.message;
      console.error(`DB migrate attempt ${attempt}/${maxAttempts} failed:`, err.message);
      if (attempt < maxAttempts) {
        await sleep(Math.min(5000 * attempt, 20000));
      }
    }
  }
}

function enableDevOtpFallback(reason) {
  if (process.env.ALLOW_DEV_OTP === 'false') {
    console.warn(reason);
    return false;
  }
  if (process.env.ALLOW_DEV_OTP !== 'true') {
    process.env.ALLOW_DEV_OTP = 'true';
  }
  console.warn(`${reason} — continuing with in-memory OTP/data fallback.`);
  return true;
}

async function boot() {
  if (!process.env.DATABASE_URL) {
    console.warn('DATABASE_URL not set — link sharecharge-db in Render Environment.');
    enableDevOtpFallback('DATABASE_URL missing');
  } else {
    try {
      await initDatabase();
    } catch (err) {
      console.error('DB init failed:', err.message);
    }

    if (!app.locals.dbReady) {
      const fallback = enableDevOtpFallback('DB migrate failed');
      if (!fallback && process.env.ALLOW_DEV_OTP === 'false') {
        throw new Error(app.locals.dbError || 'DB migrate failed');
      }
    }
  }

  if (!app.locals.dbReady) {
    initMemDataStore();
    console.warn('In-memory data store active (stations/bookings) until DATABASE_URL is linked.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ShareCharge API listening on http://0.0.0.0:${PORT} (dbReady=${app.locals.dbReady})`);
    console.log(`SPA frontend: ${hasPublic ? 'enabled (index.html at /)' : 'MISSING — only JSON API at /'}`);
  });
}

boot().catch((err) => {
  console.error('Boot failed:', err);
  process.exit(1);
});
