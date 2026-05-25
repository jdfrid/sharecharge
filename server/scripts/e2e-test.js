/**
 * ShareCharge API end-to-end smoke test.
 * Requires API running at BASE_URL (default http://localhost:3001).
 */
const BASE = (process.env.API_BASE || 'http://localhost:3001').replace(/\/$/, '');
const API = `${BASE}/api/sharecharge`;

const ACCOUNTS = {
  client: { email: 'driver@sharecharge.app', portal: 'client' },
  provider: { email: 'host@sharecharge.app', portal: 'provider' },
  ops: { email: 'admin@sharecharge.app', portal: 'system' },
};

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(data?.error || `${res.status} ${path}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function login(account) {
  const send = await request('/auth/otp/send', {
    method: 'POST',
    body: { email: account.email, portal: account.portal },
  });
  const code = send.devCode;
  if (!code) throw new Error(`No devCode for ${account.email} — set NODE_ENV=development`);
  const verify = await request('/auth/otp/verify', {
    method: 'POST',
    body: { email: account.email, portal: account.portal, code },
  });
  return verify.token;
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  console.log('E2E: health check…');
  const health = await fetch(`${BASE}/api/health`);
  assert(health.ok, 'Health check failed');

  console.log('E2E: login driver, host, admin…');
  const driverToken = await login(ACCOUNTS.client);
  const hostToken = await login(ACCOUNTS.provider);
  const adminToken = await login(ACCOUNTS.ops);

  console.log('E2E: load state…');
  const state = await request('/ops/state', { token: adminToken });
  assert(Array.isArray(state.stations) && state.stations.length > 0, 'Expected seeded stations');
  const station = state.stations[0];

  console.log('E2E: create booking (driver)…');
  const { booking } = await request('/bookings', {
    method: 'POST',
    token: driverToken,
    body: {
      stationId: station.id,
      startTime: '18:00',
      durationHours: 2,
    },
  });
  assert(booking?.id, 'Booking not created');

  console.log('E2E: approve booking (host)…');
  await request(`/bookings/${booking.id}/approve`, { method: 'POST', token: hostToken });

  console.log('E2E: mark on way + verify OTP (driver/host)…');
  const onWay = await request(`/bookings/${booking.id}/on-way`, { method: 'POST', token: driverToken });
  const otp = onWay.booking?.otp;
  assert(otp, 'OTP not generated');
  await request(`/bookings/${booking.id}/verify-otp`, {
    method: 'POST',
    token: hostToken,
    body: { otp },
  });

  console.log('E2E: start + finish charge…');
  await request(`/bookings/${booking.id}/start-charge`, { method: 'POST', token: driverToken });
  await request(`/bookings/${booking.id}/finish`, {
    method: 'POST',
    token: hostToken,
    body: { kwh: 12.5 },
  });

  console.log('E2E: verify completed in shared state…');
  const finalState = await request('/ops/state', { token: adminToken });
  const done = finalState.bookings.find((b) => b.id === booking.id);
  assert(done?.status === 'completed', `Expected completed, got ${done?.status}`);
  assert(finalState.transactions.some((tx) => tx.bookingId === booking.id), 'Transaction missing');

  console.log('E2E: ops add station visible to all…');
  const newStationName = `E2E Station ${Date.now()}`;
  await request('/ops/stations', {
    method: 'POST',
    token: adminToken,
    body: {
      name: newStationName,
      address: 'Test St 1',
      hostId: state.users.find((u) => u.role === 'host')?.id,
      plug: 'Type 2',
      power: 22,
      pricePerKwh: 1.5,
      lat: 32.09,
      lng: 34.79,
    },
  });
  const afterAdd = await request('/ops/state', { token: driverToken });
  assert(afterAdd.stations.some((s) => s.name === newStationName), 'New station not in driver state');

  console.log('\n✓ All ShareCharge E2E checks passed.');
}

main().catch((err) => {
  console.error('\n✗ E2E failed:', err.message);
  if (err.data) console.error(err.data);
  process.exit(1);
});
