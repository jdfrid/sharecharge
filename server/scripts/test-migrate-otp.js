process.env.USE_PG_MEM = 'true';
import { migrate } from '../src/db/migrate.js';
import { query } from '../src/db/pool.js';

try {
  await migrate();
  await query(
    `INSERT INTO auth_otps (email, portal, code, expires_at)
     VALUES ('test@test.com', 'client', '1234', $1)
     ON CONFLICT (email, portal) DO UPDATE SET code = EXCLUDED.code`,
    [Date.now() + 600000],
  );
  console.log('migrate+otp OK');
} catch (err) {
  console.error('FAIL', err.message);
  process.exit(1);
}
