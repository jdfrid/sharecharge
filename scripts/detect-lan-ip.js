/**
 * Detects LAN IPv4 for APK builds (phone → dev machine API).
 * Writes VITE_SHARECHARGE_API_URL to .env.<flavor>.local
 */
import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const port = process.env.API_PORT || '3001';

const WIFI_HINTS = ['wi-fi', 'wifi', 'wlan', 'wireless', '802.11'];

function isVirtualInterface(name = '') {
  const n = name.toLowerCase();
  return (
    n.includes('virtual') ||
    n.includes('vethernet') ||
    n.includes('hyper-v') ||
    n.includes('vmware') ||
    n.includes('virtualbox') ||
    n.includes('bluetooth') ||
    n.includes('loopback') ||
    n.includes('vpn') ||
    n.includes('tailscale') ||
    n.includes('wsl')
  );
}

function scoreInterface(name = '') {
  const n = name.toLowerCase();
  if (isVirtualInterface(n)) return -10;
  if (WIFI_HINTS.some((hint) => n.includes(hint))) return 10;
  if (n.includes('ethernet') || n.includes('eth')) return 5;
  return 0;
}

function detectLanIp() {
  const nets = os.networkInterfaces();
  const candidates = [];

  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family !== 'IPv4' || net.internal || net.address.startsWith('169.254')) continue;
      candidates.push({ name, address: net.address, score: scoreInterface(name) });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  if (candidates[0]) {
    console.log(`Using LAN IP ${candidates[0].address} from adapter "${candidates[0].name}"`);
    return candidates[0].address;
  }
  return '10.0.2.2';
}

function probeHealth(ip) {
  return new Promise((resolve) => {
    const req = http.get(`http://${ip}:${port}/api/health`, { timeout: 1500 }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

const forceApi = process.argv.includes('--api');

async function main() {
  if (process.env.SKIP_LAN_IP === '1' || process.env.SKIP_LAN_IP === 'true') {
    console.log('Skipping LAN IP detection (SKIP_LAN_IP — using existing .env.*.local).');
    return;
  }

  const ipArg = process.argv.slice(2).find((arg) => !arg.startsWith('--') && /^\d+\.\d+\.\d+\.\d+$/.test(arg));
  const ip = ipArg || detectLanIp();
  const apiUrl = `http://${ip}:${port}`;
  const flavors = ['client', 'provider', 'ops'];

  const apiUp = await probeHealth(ip);
  const dataMode = forceApi ? (apiUp ? 'api' : 'local') : apiUp ? 'api' : 'local';

  for (const flavor of flavors) {
    const file = path.join(root, `.env.${flavor}.local`);
    const content = `VITE_SHARECHARGE_DATA_MODE=${dataMode}\nVITE_SHARECHARGE_APP=${flavor}\nVITE_SHARECHARGE_API_URL=${apiUrl}\n`;
    fs.writeFileSync(file, content);
  }

  console.log(`API URL for APK builds: ${apiUrl}`);
  console.log(`Build data mode: ${dataMode}${apiUp ? ' (server reachable)' : ' (server down — local demo only)'}`);
  console.log(`Updated: ${flavors.map((f) => `.env.${f}.local`).join(', ')}`);
  if (forceApi && !apiUp) {
    console.log('Warning: --api requested but health check failed; built with local demo mode.');
  }
  if (dataMode === 'local') {
    console.log('Note: local demo — client/provider apps do NOT share bookings. Start API and rebuild.');
  }
}

main();
