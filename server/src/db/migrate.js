import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from './pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function migrate() {
  const sqlPath = path.join(__dirname, '../../db/migrations/001_init.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await query(sql);
  console.log('Migration 001 applied.');
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  migrate()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
