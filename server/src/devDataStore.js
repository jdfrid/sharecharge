import { listMemUsers, loadMemUserByEmail, saveMemUser } from './devAuthStore.js';
import { isWithinStationGeofence } from './geo.js';
import { createId, createOtp, rowToBooking, rowToDispute, rowToStation, rowToTransaction, rowToUser } from './utils.js';

const settings = {
  commission: 12.5,
  cancellation_fee: 15,
  otp_window_minutes: 15,
};

const seedUsers = [
  { id: 'driver-1', name: 'דני לוי', email: 'driver@sharecharge.app', role: 'driver', verified: true, blocked: false, revenue: 0, spend: 286, created_at: Date.now() },
  { id: 'driver-2', name: 'נועה כהן', email: 'noa@sharecharge.app', role: 'driver', verified: true, blocked: false, revenue: 0, spend: 154, created_at: Date.now() },
  { id: 'host-1', name: 'מיכל רוזן', email: 'host@sharecharge.app', role: 'host', verified: true, blocked: false, revenue: 1840, spend: 0, created_at: Date.now() },
  { id: 'host-2', name: 'אורי שגב', email: 'host2@sharecharge.app', role: 'host', verified: true, blocked: false, revenue: 620, spend: 0, created_at: Date.now() },
  { id: 'admin-1', name: 'מנהל מערכת', email: 'admin@sharecharge.app', role: 'admin', verified: true, blocked: false, revenue: 0, spend: 0, created_at: Date.now() },
];

const seedStations = [
  {
    id: 'station-1',
    host_id: 'host-1',
    name: 'עמדת וילה ירוקה',
    address: 'הפרדס 18, רמת השרון',
    lat: 32.1378,
    lng: 34.8403,
    distance: 0.7,
    power: 22,
    plug: 'Type 2',
    price_per_kwh: 1.35,
    available: true,
    rating: 4.9,
    photos: 6,
    terms_text: 'גישה לעמדה מהחניה · נא לתאם זמן הגעה',
    service_category: 'charging',
    created_at: Date.now(),
  },
  {
    id: 'station-2',
    host_id: 'host-1',
    name: 'חניה פרטית שקטה',
    address: 'קהילת ונציה 4, תל אביב',
    lat: 32.0853,
    lng: 34.7818,
    distance: 1.4,
    power: 11,
    plug: 'Type 2',
    price_per_kwh: 1.18,
    available: true,
    rating: 4.8,
    photos: 4,
    terms_text: 'חניה צרה — נא להקפיד על פתיחת מראות',
    service_category: 'charging',
    created_at: Date.now(),
  },
  {
    id: 'station-3',
    host_id: 'host-2',
    name: 'מטען מהיר בחצר',
    address: 'הגליל 9, הרצליה',
    lat: 32.1624,
    lng: 34.8447,
    distance: 2.1,
    power: 50,
    plug: 'CCS',
    price_per_kwh: 1.55,
    available: true,
    rating: 4.7,
    photos: 3,
    terms_text: 'CCS בלבד · שעות שקט 22:00–07:00',
    service_category: 'charging',
    created_at: Date.now(),
  },
  {
    id: 'bakery-1',
    host_id: 'host-1',
    name: 'פנזריה רוזן',
    address: 'אחוזה 12, רמת השרון',
    lat: 32.1395,
    lng: 34.8395,
    distance: 0.9,
    power: 0,
    plug: 'מגשים',
    price_per_kwh: 45,
    available: true,
    rating: 4.8,
    photos: 5,
    terms_text: 'הזמנה מראש · איסוף בחנות',
    service_category: 'bakery',
    created_at: Date.now(),
  },
  {
    id: 'bakery-2',
    host_id: 'host-2',
    name: 'מאפיית השכונה',
    address: 'דיזנגoff 88, תל אביב',
    lat: 32.0785,
    lng: 34.7745,
    distance: 1.8,
    power: 0,
    plug: 'מארזים',
    price_per_kwh: 38,
    available: true,
    rating: 4.6,
    photos: 4,
    terms_text: 'מינימום הזמנה ₪80',
    service_category: 'bakery',
    created_at: Date.now(),
  },
  {
    id: 'tow-1',
    host_id: 'host-2',
    name: 'גרר מהיר 24/7',
    address: 'המסגר 5, הרצליה',
    lat: 32.164,
    lng: 34.846,
    distance: 2.3,
    power: 0,
    plug: 'גרירה',
    price_per_kwh: 180,
    available: true,
    rating: 4.9,
    photos: 3,
    terms_text: 'הגעה עד 40 דק׳ · תשלום לפי ק״מ',
    service_category: 'tow',
    created_at: Date.now(),
  },
  {
    id: 'garage-1',
    host_id: 'host-1',
    name: 'מוסך אלון',
    address: 'החרושת 3, רamat השרון',
    lat: 32.1365,
    lng: 34.8425,
    distance: 1.1,
    power: 0,
    plug: 'תיקון',
    price_per_kwh: 95,
    available: true,
    rating: 4.7,
    photos: 4,
    terms_text: 'אבחון + תיקון · תיאום מראש',
    service_category: 'garage',
    created_at: Date.now(),
  },
  {
    id: 'garage-2',
    host_id: 'host-2',
    name: 'מוסך מרכז',
    address: 'הנגר 20, תל אביב',
    lat: 32.082,
    lng: 34.785,
    distance: 1.6,
    power: 0,
    plug: 'שירות',
    price_per_kwh: 110,
    available: true,
    rating: 4.5,
    photos: 2,
    terms_text: 'טיפולים, צמיגים, מיזוג',
    service_category: 'garage',
    created_at: Date.now(),
  },
];

let users = [];
let stations = [];
let bookings = [];
let transactions = [];
let disputes = [];
let events = [];
let initialized = false;

function memUserToRow(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    verified: user.verified ?? true,
    blocked: user.blocked ?? false,
    revenue: user.revenue ?? 0,
    spend: user.spend ?? 0,
    created_at: user.createdAt ?? Date.now(),
  };
}

function allUsers() {
  const byEmail = new Map(users.map((row) => [row.email.toLowerCase(), row]));
  for (const memUser of listMemUsers()) {
    byEmail.set(memUser.email.toLowerCase(), memUserToRow(memUser));
  }
  return [...byEmail.values()];
}

function findUserById(id) {
  return allUsers().find((row) => row.id === id) || null;
}

function ensureDriverFromJwt(jwtUser) {
  if (!jwtUser?.sub || jwtUser.role !== 'driver') return null;
  let driver = findUserById(jwtUser.sub);
  if (driver) return driver;

  const email = jwtUser.email?.toLowerCase()?.trim();
  if (email) {
    const memUser = loadMemUserByEmail(email);
    if (memUser) return memUserToRow(memUser);
  }

  if (!email) return null;

  const user = {
    id: jwtUser.sub,
    name: email.split('@')[0] || 'לקוח',
    email,
    role: 'driver',
    verified: true,
    blocked: false,
    revenue: 0,
    spend: 0,
    createdAt: Date.now(),
  };
  saveMemUser(user);
  return memUserToRow(user);
}

export function initMemDataStore() {
  if (initialized) return;
  users = seedUsers.map((row) => ({ ...row }));
  stations = seedStations.map((row) => ({ ...row }));
  bookings = [];
  transactions = [];
  disputes = [];
  events = [{ id: 'event-1', text: 'המערכת מוכנה לקבלת הזמנות (מצב זיכרון)', type: 'system', time: Date.now() - 1000 * 60 * 12 }];
  initialized = true;
}

export function isMemDataReady() {
  return initialized;
}

export function loadFullStateMem() {
  if (!initialized) initMemDataStore();
  return {
    settings: {
      commission: settings.commission,
      cancellationFee: settings.cancellation_fee,
      otpWindowMinutes: settings.otp_window_minutes,
    },
    users: allUsers().map(rowToUser),
    stations: stations.map(rowToStation),
    bookings: bookings.map(rowToBooking),
    transactions: transactions.map(rowToTransaction),
    disputes: disputes.map(rowToDispute),
    events: events.map((row) => ({
      id: row.id,
      text: row.text,
      type: row.type,
      time: Number(row.time),
    })),
  };
}

export function getSettingsMem() {
  return {
    commission: settings.commission,
    cancellationFee: settings.cancellation_fee,
    otpWindowMinutes: settings.otp_window_minutes,
  };
}

export function addEventMem(text, type = 'activity') {
  if (!initialized) initMemDataStore();
  events.unshift({
    id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    text,
    type,
    time: Date.now(),
  });
  events = events.slice(0, 20);
}

export function createBookingMem(jwtUser, { stationId, startTime, durationHours }) {
  if (!initialized) initMemDataStore();
  const normalizedStationId = String(stationId || '').trim();
  const station = stations.find((row) => row.id === normalizedStationId);
  if (!normalizedStationId || !station) {
    return { error: 'station_not_found' };
  }
  if (!station.available) {
    return { error: 'station_unavailable' };
  }

  const driver = ensureDriverFromJwt(jwtUser);
  if (!driver) {
    return { error: 'driver_not_found' };
  }

  const row = {
    id: createId('booking'),
    station_id: normalizedStationId,
    driver_id: driver.id,
    driver_email_snapshot: driver.email,
    host_id: station.host_id,
    start_time: startTime || '19:30',
    duration_hours: Number(durationHours) || 2,
    status: 'pending',
    created_at: Date.now(),
    notes: '[]',
    otp: '',
    otp_expires_at: null,
    kwh: 0,
    amount: 0,
    host_share: 0,
    platform_fee: 0,
    driver_confirmed_start: false,
    host_confirmed_connection: false,
    check_in_at: null,
    last_driver_lat: null,
    last_driver_lng: null,
    last_location_at: null,
    dwell_exceeded: false,
  };
  bookings.unshift(row);
  addEventMem(`הזמנה מ${driver.name} (${driver.email}) → ${station.name}`);
  return { booking: rowToBooking(row) };
}

export function getBookingMem(id) {
  if (!initialized) initMemDataStore();
  const row = bookings.find((item) => item.id === id);
  return row ? rowToBooking(row) : null;
}

export function getBookingRowMem(id) {
  if (!initialized) initMemDataStore();
  return bookings.find((item) => item.id === id) || null;
}

export function updateBookingMem(id, patchFn) {
  if (!initialized) initMemDataStore();
  const row = bookings.find((item) => item.id === id);
  if (!row) return null;
  patchFn(row);
  return rowToBooking(row);
}

export function listBookingsMem(jwtUser) {
  if (!initialized) initMemDataStore();
  let rows = bookings;
  if (jwtUser.role === 'driver') rows = rows.filter((row) => row.driver_id === jwtUser.sub);
  if (jwtUser.role === 'host') rows = rows.filter((row) => row.host_id === jwtUser.sub);
  return rows.map(rowToBooking);
}

export function finishBookingMem(bookingId, hostId, kwh) {
  if (!initialized) initMemDataStore();
  const booking = bookings.find((row) => row.id === bookingId);
  if (!booking || booking.host_id !== hostId || booking.status !== 'charging') return null;

  const station = stations.find((row) => row.id === booking.station_id);
  if (!station) return null;

  const amount = Number((Number(kwh) * Number(station.price_per_kwh)).toFixed(2));
  const platformFee = Number((amount * settings.commission / 100).toFixed(2));
  const hostShare = Number((amount - platformFee).toFixed(2));
  const now = Date.now();

  booking.status = 'completed';
  booking.completed_at = now;
  booking.kwh = Number(kwh);
  booking.amount = amount;
  booking.host_share = hostShare;
  booking.platform_fee = platformFee;

  transactions.unshift({
    id: createId('tx'),
    booking_id: booking.id,
    station_id: station.id,
    driver_id: booking.driver_id,
    host_id: booking.host_id,
    amount,
    host_share: hostShare,
    platform_fee: platformFee,
    kwh: Number(kwh),
    status: 'paid_mock',
    created_at: now,
  });

  addEventMem(`טעינה הסתיימה · חויב סך ₪${amount}`);
  return rowToBooking(booking);
}

export function openDisputeMem(bookingId, reason) {
  if (!initialized) initMemDataStore();
  const booking = bookings.find((row) => row.id === bookingId);
  if (!booking) return { error: 'not_found', status: 404 };
  if (disputes.some((row) => row.booking_id === bookingId && row.status === 'open')) {
    return { error: 'already_open', status: 409 };
  }
  const id = createId('dispute');
  disputes.unshift({
    id,
    booking_id: bookingId,
    reason: reason || 'Dispute',
    status: 'open',
    created_at: Date.now(),
    resolved_at: null,
  });
  addEventMem('נפתחה מחלוקת לטיפול מנהל', 'warning');
  return { ok: true, id };
}

export function updateBookingLocationMem(bookingId, driverId, { lat, lng }) {
  if (!initialized) initMemDataStore();
  const booking = bookings.find((row) => row.id === bookingId);
  if (!booking) return { error: 'not_found' };
  if (booking.driver_id !== driverId) return { error: 'forbidden' };

  const station = stations.find((row) => row.id === booking.station_id);
  if (!station) return { error: 'not_found' };

  const atStation = isWithinStationGeofence(lat, lng, station.lat, station.lng);
  const now = Date.now();
  booking.last_driver_lat = lat;
  booking.last_driver_lng = lng;
  booking.last_location_at = now;
  if (atStation && !booking.check_in_at) booking.check_in_at = now;
  if (booking.check_in_at && atStation && now > Number(booking.check_in_at) + Number(booking.duration_hours) * 3600000) {
    if (!booking.dwell_exceeded) {
      addEventMem(`חריגת זמן שהייה — ${station.name}`, 'warning');
    }
    booking.dwell_exceeded = true;
  }

  return {
    booking: rowToBooking(booking),
    atStation,
    dwellExceeded: booking.dwell_exceeded === true,
  };
}
