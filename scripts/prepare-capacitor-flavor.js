/**
 * Applies Android product flavor metadata before cap sync.
 * Usage: node scripts/prepare-capacitor-flavor.js client
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const flavor = process.argv[2] || 'client';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const flavors = {
  client: { appId: 'com.sharecharge.client', appName: 'ShareCharge לקוח' },
  provider: { appId: 'com.sharecharge.provider', appName: 'ShareCharge ספק' },
  ops: { appId: 'com.sharecharge.ops', appName: 'ShareCharge ניהול' },
};

const meta = flavors[flavor] || flavors.client;
const configPath = path.join(root, 'capacitor.config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
config.appId = meta.appId;
config.appName = meta.appName;
fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
console.log(`Capacitor flavor: ${flavor} → ${meta.appId}`);
