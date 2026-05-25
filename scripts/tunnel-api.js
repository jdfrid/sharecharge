/**
 * Public tunnel when LAN/Wi-Fi does not reach the PC (no firewall fix needed).
 * Usage: npm run start:api   (terminal 1)
 *        npm run tunnel:api   (terminal 2)
 * Copy the https URL into phone browser .../api/health then rebuild APK:
 *   set VITE_SHARECHARGE_API_URL=https://xxxx.loca.lt
 *   npm run build:android:all
 */
import { spawn } from 'child_process';
import http from 'http';

const port = process.env.API_PORT || '3001';

function waitForApi() {
  return new Promise((resolve, reject) => {
    let tries = 0;
    const tick = () => {
      const req = http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
        res.resume();
        if (res.statusCode === 200) resolve();
        else if (++tries > 30) reject(new Error('API not healthy'));
        else setTimeout(tick, 1000);
      });
      req.on('error', () => {
        if (++tries > 30) reject(new Error(`Start API first: npm run start:api (port ${port})`));
        else setTimeout(tick, 1000);
      });
    };
    tick();
  });
}

async function main() {
  console.log(`Waiting for API on port ${port}...`);
  await waitForApi();
  console.log('API OK. Opening tunnel (requires internet)...\n');

  const lt = spawn('npx', ['--yes', 'localtunnel', '--port', port], {
    shell: true,
    stdio: ['ignore', 'pipe', 'inherit'],
  });

  lt.stdout.on('data', (buf) => {
    const text = buf.toString();
    process.stdout.write(text);
    const m = text.match(/https:\/\/[^\s]+/);
    if (m) {
      console.log('\n--- Phone test URL ---');
      console.log(`${m[0]}/api/health`);
      console.log('\nRebuild APK with this base URL (no trailing slash):');
      console.log(`  set VITE_SHARECHARGE_API_URL=${m[0]}`);
      console.log('  npm run build:android:all');
    }
  });
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
