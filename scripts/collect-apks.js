/**
 * Copies built APKs to release/apk/ with friendly names.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const outDir = path.join(root, 'release', 'apk');
const installDir = path.join(root, 'release', 'install');

const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-');

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
fs.mkdirSync(installDir, { recursive: true });

let copied = 0;
const datedNames = [];

for (const [dir, candidates, dest] of maps) {
  const from = findApk(dir, candidates);
  if (!from) {
    console.warn(`Missing APK in ${dir}`);
    continue;
  }
  const stat = fs.statSync(from);
  fs.copyFileSync(from, path.join(outDir, dest));
  const base = dest.replace('.apk', '');
  const dated = `${base}-${stamp}.apk`;
  fs.copyFileSync(from, path.join(installDir, dest));
  fs.copyFileSync(from, path.join(installDir, dated));
  datedNames.push(dated);
  copied += 1;
  console.log(`→ release/apk/${dest} (${stat.size} bytes, ${stat.mtime.toISOString()})`);
  console.log(`→ release/install/${dated}`);
}

const gradle = fs.readFileSync(path.join(root, 'android/app/build.gradle'), 'utf8');
const versionName = gradle.match(/versionName\s+"([^"]+)"/)?.[1] ?? '?';
const versionCode = gradle.match(/versionCode\s+(\d+)/)?.[1] ?? '?';

const buildInfo = [
  `ShareCharge APK build`,
  `Built: ${new Date().toLocaleString('he-IL')}`,
  `Version: ${versionName} (code ${versionCode})`,
  '',
  'Latest files (use these):',
  ...datedNames.map((name) => `  release/install/${name}`),
  '',
  'Stable names (overwritten each build):',
  ...maps.map((m) => `  release/install/${m[2]}`),
].join('\n');

fs.writeFileSync(path.join(installDir, 'BUILD_INFO.txt'), `${buildInfo}\n`);
console.log(`→ release/install/BUILD_INFO.txt`);

console.log(copied ? `\n${copied} APK(s) ready in release/install/` : '\nNo APK files found — run npm run build:android:all first.');
