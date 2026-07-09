import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const target = path.join(root, 'server', 'public');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('Missing dist/index.html — run npm run build first');
  process.exit(1);
}

if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
copyDir(dist, target);
console.log(`Synced ${dist} → ${target}`);
