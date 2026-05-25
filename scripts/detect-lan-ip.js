/**
 * Detects LAN IPv4 for APK builds (phone → dev machine API).
 * Writes VITE_SHARECHARGE_API_URL to .env.<flavor>.local
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const port = process.env.API_PORT || '3001';

function detectLanIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254')) {
        return net.address;
      }
    }
  }
  return '10.0.2.2';
}

const ip = process.argv[2] || detectLanIp();
const apiUrl = `http://${ip}:${port}`;
const flavors = ['client', 'provider', 'ops'];

for (const flavor of flavors) {
  const file = path.join(root, `.env.${flavor}.local`);
  const content = `VITE_SHARECHARGE_DATA_MODE=api\nVITE_SHARECHARGE_APP=${flavor}\nVITE_SHARECHARGE_API_URL=${apiUrl}\n`;
  fs.writeFileSync(file, content);
}

console.log(`API URL for APK builds: ${apiUrl}`);
console.log(`Updated: ${flavors.map((f) => `.env.${f}.local`).join(', ')}`);
