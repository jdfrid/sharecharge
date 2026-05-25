import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool: PgPool } = pg;

/** @type {import('pg').Pool | null} */
let pool = null;
/** @type {Promise<import('pg').Pool> | null} */
let initPromise = null;

async function createPool() {
  if (process.env.USE_PG_MEM === 'true') {
    const { newDb } = await import('pg-mem');
    const db = newDb({ autoCreateForeignKeyIndices: true });
    db.public.registerFunction({
      name: 'current_database',
      implementation: () => 'sharecharge',
    });
    const { Pool: MemPool } = db.adapters.createPg();
    console.log('[DB] Using in-memory PostgreSQL (pg-mem) — no Docker required');
    return new MemPool();
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required (or set USE_PG_MEM=true for local dev)');
  }

  const needsSsl =
    process.env.DATABASE_SSL === 'true' ||
    process.env.NODE_ENV === 'production' ||
    /render\.com|sslmode=require/i.test(process.env.DATABASE_URL);

  return new PgPool({
    connectionString: process.env.DATABASE_URL,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  });
}

export async function getPool() {
  if (pool) return pool;
  if (!initPromise) initPromise = createPool();
  pool = await initPromise;
  return pool;
}

export async function query(text, params) {
  const p = await getPool();
  return p.query(text, params);
}

/** @deprecated use query() — kept for legacy imports */
export { getPool as pool };
