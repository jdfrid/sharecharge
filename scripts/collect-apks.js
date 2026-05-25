/**
 * Copies built APKs to release/apk/ with friendly names.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const outDir = path.join(root, 'release', 'apk');

const maps = [
  [
    'android/app/build/outputs/apk/client/release',
    ['app-client-release.apk', 'app-client-release-unsigned.apk'],
    'ShareCharge-client.apk',
  ],
  [
    'android/app/build/outputs/apk/provider/release',
    ['app-provider-release.apk', 'app-provider-release-unsigned.apk'],
    'ShareCharge-provider.apk',
  ],
  [
    'android/app/build/outputs/apk/ops/release',
    ['app-ops-release.apk', 'app-ops-release-unsigned.apk'],
    'ShareCharge-ops.apk',
  ],
];

function findApk(dir, candidates) {
  for (const name of candidates) {
    const p = path.join(root, dir, name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

fs.mkdirSync(outDir, { recursive: true });
let copied = 0;
for (const [dir, candidates, dest] of maps) {
  const from = findApk(dir, candidates);
  if (!from) {
    console.warn(`Missing APK in ${dir}`);
    continue;
  }
  fs.copyFileSync(from, path.join(outDir, dest));
  copied += 1;
  console.log(`→ release/apk/${dest}`);
}
console.log(copied ? `\n${copied} APK(s) ready in release/apk/` : '\nNo APK files found — run npm run build:android:all first.');
