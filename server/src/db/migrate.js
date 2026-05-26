import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from './pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function splitSqlStatements(sql) {
  return sql
    .split(';')
    .map((part) => part.replace(/^\s*--[^\n]*$/gm, '').trim())
    .filter((part) => part.length > 0);
}

export async function migrate() {
  const sqlPath = path.join(__dirname, '../../db/migrations/001_init.sql');
  if (!fs.existsSync(sqlPath)) {
    throw new Error(`Migration file missing: ${sqlPath}`);
  }
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const statements = splitSqlStatements(sql);
  for (const statement of statements) {
    await query(`${statement};`);
  }
  console.log(`Migration 001 applied (${statements.length} statements).`);
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  migrate()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
