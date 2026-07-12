/**
 * Point APK builds at Render (or any public HTTPS API).
 * Usage:
 *   node scripts/setup-render-env.js
 *   node scripts/setup-render-env.js https://sharecharge-api.onrender.com
 */
import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const defaultUrl = process.env.RENDER_API_URL || 'https://sharecharge.onrender.com';
const rawUrl = (process.argv[2] || defaultUrl).replace(/\/$/, '');
const flavors = ['client', 'provider', 'ops'];

function probeHealth(baseUrl) {
  return new Promise((resolve) => {
    const url = `${baseUrl}/api/health`;
    https
      .get(url, { timeout: 8000 }, (res) => {
        res.resume();
        resolve({ ok: res.statusCode === 200, status: res.statusCode });
      })
      .on('error', () => resolve({ ok: false, status: 0 }));
  });
}

async function main() {
  console.log(`Render API URL: ${rawUrl}`);
  const health = await probeHealth(rawUrl);

  if (health.ok) {
    console.log('Health check: OK');
  } else {
    console.warn(`Health check failed (HTTP ${health.status || 'network error'}).`);
    console.warn('Deploy on Render first, then re-run this script.');
    console.warn('Dashboard → New → Blueprint → connect GitHub repo → Apply');
  }

  for (const flavor of flavors) {
    const file = path.join(root, `.env.${flavor}.local`);
    const content = `VITE_SHARECHARGE_DATA_MODE=api\nVITE_SHARECHARGE_APP=${flavor}\nVITE_SHARECHARGE_API_URL=${rawUrl}\n${process.env.GOOGLE_CLIENT_ID ? `VITE_GOOGLE_CLIENT_ID=${process.env.GOOGLE_CLIENT_ID.split(',')[0].trim()}\n` : ''}`;
    fs.writeFileSync(file, content);
  }

  console.log(`Updated: ${flavors.map((f) => `.env.${f}.local`).join(', ')}`);
  console.log('Next: npm run build:android:all');
  console.log(`Phone test: ${rawUrl}/api/health`);
}

main();
