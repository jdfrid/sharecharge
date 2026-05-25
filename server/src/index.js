import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import stationRoutes from './routes/stations.js';
import bookingRoutes from './routes/bookings.js';
import opsRoutes from './routes/ops.js';
import { migrate } from './db/migrate.js';
import { seed } from './db/seed.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

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

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'sharecharge-api', port: PORT });
});

app.use('/api/sharecharge/auth', authRoutes);
app.use('/api/sharecharge/stations', stationRoutes);
app.use('/api/sharecharge/bookings', bookingRoutes);
app.use('/api/sharecharge/ops', opsRoutes);

async function boot() {
  if (process.env.AUTO_MIGRATE !== 'false') {
    try {
      await migrate();
      if (process.env.AUTO_SEED !== 'false') {
        await seed();
      }
    } catch (err) {
      console.warn('DB migrate/seed skipped or failed:', err.message);
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ShareCharge API listening on http://0.0.0.0:${PORT}`);
  });
}

boot();
