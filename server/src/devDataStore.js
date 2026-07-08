import { listMemUsers, loadMemUserByEmail, saveMemUser } from './devAuthStore.js';
import { isWithinStationGeofence } from './geo.js';
import { findProvidersInRadius, summarizeEmergencyNotify } from './services/emergencyNotifyService.js';
import { isChargingStation } from './services/serviceCategories.js';
import { calculateBookingAmount, calculateKwhFromSession } from './chargingBilling.js';
import { createId, createOtp, rowToBooking, rowToDispute, rowToPayment, rowToPaymentMethod, rowToPaymentSplit, rowToServiceBid, rowToServiceRequest, rowToStation, rowToTransaction, rowToUser } from './utils.js';

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
  {
    id: 'charge-jlm-1',
    host_id: 'host-1',
    name: 'עמדת בלוי',
    address: 'הרב בלוי 8, ירושלים',
    lat: 31.7946,
    lng: 35.2137,
    distance: 0.5,
    power: 22,
    plug: 'Type 2',
    price_per_kwh: 1.35,
    available: true,
    rating: 4.9,
    photos: 4,
    terms_text: 'חניה פרטית · תיאום מראש',
    service_category: 'charging',
    created_at: Date.now(),
  },
  {
    id: 'fuel-jlm-1',
    host_id: 'host-2',
    name: 'דלק חירום ירושלים',
    address: 'רחוב בית הדפוס, ירושלים',
    lat: 31.7515,
    lng: 35.2182,
    distance: 0.3,
    power: 0,
    plug: 'דלק',
    price_per_kwh: 35,
    available: true,
    rating: 4.8,
    photos: 2,
    terms_text: 'הגעה עם דלק · תשלום לפי ליטר',
    service_category: 'fuel',
    created_at: Date.now(),
  },
  {
    id: 'puncture-jlm-1',
    host_id: 'host-1',
    name: "פנצ'ריה מהירה ירושלים",
    address: 'יפו 120, ירושלים',
    lat: 31.7855,
    lng: 35.2055,
    distance: 0.8,
    power: 0,
    plug: "פנצ'",
    price_per_kwh: 55,
    available: true,
    rating: 4.9,
    photos: 3,
    terms_text: 'תיקון בשטח · עד 30 דק׳',
    service_category: 'puncture',
    created_at: Date.now(),
  },
  {
    id: 'tow-jlm-1',
    host_id: 'host-2',
    name: 'גרר ירושלים 24/7',
    address: 'שדרות בegin 50, ירושלים',
    lat: 31.792,
    lng: 35.195,
    distance: 1.2,
    power: 0,
    plug: 'גרירה',
    price_per_kwh: 190,
    available: true,
    rating: 4.8,
    photos: 2,
    terms_text: 'גרירה עירונית ובין-עירונית',
    service_category: 'tow',
    created_at: Date.now(),
  },
  {
    id: 'garage-jlm-1',
    host_id: 'host-1',
    name: 'מוסך + מצבר ירושלים',
    address: 'הארז 5, ירושלים',
    lat: 31.788,
    lng: 35.21,
    distance: 0.9,
    power: 0,
    plug: 'מצבר',
    price_per_kwh: 100,
    available: true,
    rating: 4.7,
    photos: 3,
    terms_text: 'התנעה · החלפת מצבר · תיקונים',
    service_category: 'garage',
    created_at: Date.now(),
  },
];

let users = [];
let stations = [];
let bookings = [];
let transactions = [];
let disputes = [];
let serviceRequests = [];
let serviceBids = [];
let payments = [];
let paymentMethods = [];
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
  serviceRequests = [];
  serviceBids = [];
  payments = [];
  paymentMethods = [];
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
    serviceRequests: serviceRequests.map(rowToServiceRequest),
    serviceBids: serviceBids.map(rowToServiceBid),
    payments: payments.map((row) => rowToPayment({ ...row, splits: row.splits || [] })),
    paymentMethods: paymentMethods.map(rowToPaymentMethod),
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

const ACTIVE_BOOKING_STATUSES = ['pending', 'approved', 'on_way', 'otp_verified', 'charging'];

function findActiveBookingForStationMem(stationId) {
  return bookings.find(
    (row) => row.station_id === stationId && ACTIVE_BOOKING_STATUSES.includes(row.status),
  );
}

export function createBookingMem(jwtUser, { stationId, startTime, durationHours }) {
  if (!initialized) initMemDataStore();
  const normalizedStationId = String(stationId || '').trim();
  const station = stations.find((row) => row.id === normalizedStationId);
  if (!normalizedStationId || !station) {
    return { error: 'station_not_found' };
  }
  if (!isChargingStation(station)) {
    return { error: 'station_not_found' };
  }
  if (!station.available) {
    return { error: 'station_unavailable' };
  }
  if (findActiveBookingForStationMem(normalizedStationId)) {
    return { error: 'station_occupied' };
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

export function finishBookingMem(bookingId, hostId, kwhOverride) {
  if (!initialized) initMemDataStore();
  const booking = bookings.find((row) => row.id === bookingId);
  if (!booking || booking.host_id !== hostId || booking.status !== 'charging') return null;

  const station = stations.find((row) => row.id === booking.station_id);
  if (!station) return null;

  const now = Date.now();
  const calculatedKwh = calculateKwhFromSession({
    startedAt: booking.started_at,
    completedAt: now,
    stationPowerKw: station.power,
  });
  const kwh =
    kwhOverride != null && Number(kwhOverride) > 0
      ? Number(Number(kwhOverride).toFixed(2))
      : calculatedKwh || Number(booking.kwh || 0) || 0.5;

  const billing = calculateBookingAmount({
    kwh,
    pricePerKwh: station.price_per_kwh,
    commissionPct: settings.commission,
  });

  booking.status = 'completed';
  booking.completed_at = now;
  booking.kwh = billing.kwh;
  booking.amount = billing.amount;
  booking.host_share = billing.hostShare;
  booking.platform_fee = billing.platformFee;

  transactions.unshift({
    id: createId('tx'),
    booking_id: booking.id,
    station_id: station.id,
    driver_id: booking.driver_id,
    host_id: booking.host_id,
    amount: billing.amount,
    host_share: billing.hostShare,
    platform_fee: billing.platformFee,
    kwh: billing.kwh,
    status: 'pending',
    created_at: now,
  });

  addEventMem(`טעינה הסתיימה · ${billing.kwh} ק״wh · ₪${billing.amount}`);
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

const BID_TEMPLATES = {
  flat_tire: [
    { hostId: 'host-1', eta: 10, lines: [{ label: 'נסיעה', amount: 60 }, { label: "סpray + פנצ'ר", amount: 60 }] },
    { hostId: 'host-2', eta: 12, lines: [{ label: 'נסיעה', amount: 70 }, { label: 'תיקון', amount: 50 }] },
  ],
  fuel: [
    { hostId: 'host-2', eta: 8, lines: [{ label: 'נסיעה', amount: 50 }, { label: '2 ליטר דלק', amount: 30 }] },
  ],
  tow: [
    { hostId: 'host-2', eta: 15, lines: [{ label: 'גרירה', amount: 700 }] },
  ],
  battery: [
    { hostId: 'host-1', eta: 14, lines: [{ label: 'התנעה', amount: 50 }, { label: 'מצבר חדש', amount: 650 }] },
  ],
};

function seedDemoBids(requestId, category) {
  const templates = BID_TEMPLATES[category] || BID_TEMPLATES.flat_tire;
  for (const tpl of templates) {
    const total = tpl.lines.reduce((sum, line) => sum + line.amount, 0);
    serviceBids.unshift({
      id: createId('bid'),
      request_id: requestId,
      host_id: tpl.hostId,
      line_items: tpl.lines,
      total,
      eta_minutes: tpl.eta,
      status: 'pending',
      created_at: Date.now(),
    });
  }
}

export function createTenderMem(jwtUser, payload) {
  if (!initialized) initMemDataStore();
  const driver = ensureDriverFromJwt(jwtUser);
  if (!driver) return { error: 'forbidden', status: 403 };

  const { category, lat, lng, addressText, vehicleProfile, problemDescription, phone, notifyRadiusKm } = payload || {};
  if (!category || lat == null || lng == null) return { error: 'invalid', status: 400 };

  const id = createId('tender');
  const radius = Number(notifyRadiusKm || 50);
  const row = {
    id,
    driver_id: driver.id,
    category,
    lat: Number(lat),
    lng: Number(lng),
    address_text: addressText || '',
    problem_description: problemDescription || '',
    phone: phone || '',
    notify_radius_km: radius,
    vehicle_profile: vehicleProfile || {},
    status: 'open',
    accepted_bid_id: null,
    host_id: null,
    amount: 0,
    provider_lat: null,
    provider_lng: null,
    expires_at: Date.now() + 30 * 60 * 1000,
    created_at: Date.now(),
    completed_at: null,
  };
  serviceRequests.unshift(row);
  seedDemoBids(id, category);
  addEventMem(`קריאת חירום (${category}) מ${driver.name}`, 'activity');

  const providers = findProvidersInRadius({
    stations,
    users: listMemUsers(),
    lat: Number(lat),
    lng: Number(lng),
    radiusKm: radius,
  });
  const notify = summarizeEmergencyNotify({ providers, radiusKm: radius, category });
  return { request: rowToServiceRequest(row), notify };
}

export function listTenderBidsMem(requestId, jwtUser) {
  if (!initialized) initMemDataStore();
  const request = serviceRequests.find((row) => row.id === requestId);
  if (!request) return { error: 'not_found', status: 404 };
  if (jwtUser.role === 'driver' && request.driver_id !== jwtUser.sub) {
    return { error: 'forbidden', status: 403 };
  }
  const bids = serviceBids
    .filter((row) => row.request_id === requestId && row.status === 'pending')
    .map(rowToServiceBid);
  return { request: rowToServiceRequest(request), bids };
}

export function listOpenTendersMem(jwtUser) {
  if (!initialized) initMemDataStore();
  if (jwtUser.role !== 'host') return { error: 'forbidden', status: 403 };
  const open = serviceRequests.filter((row) => row.status === 'open').map(rowToServiceRequest);
  return { requests: open };
}

export function submitBidMem(jwtUser, requestId, payload) {
  if (!initialized) initMemDataStore();
  if (jwtUser.role !== 'host') return { error: 'forbidden', status: 403 };
  const request = serviceRequests.find((row) => row.id === requestId);
  if (!request || request.status !== 'open') return { error: 'not_found', status: 404 };

  const lineItems = payload?.lineItems || [];
  const total = Number(payload?.total ?? lineItems.reduce((s, l) => s + Number(l.amount || 0), 0));
  const bid = {
    id: createId('bid'),
    request_id: requestId,
    host_id: jwtUser.sub,
    line_items: lineItems,
    total,
    eta_minutes: Number(payload?.etaMinutes || 15),
    status: 'pending',
    created_at: Date.now(),
  };
  serviceBids.unshift(bid);
  addEventMem('הוגשה הצעת מחיר לקריאת חירום', 'activity');
  return { bid: rowToServiceBid(bid) };
}

export function counterBidMem(jwtUser, requestId, bidId, payload) {
  if (!initialized) initMemDataStore();
  const request = serviceRequests.find((row) => row.id === requestId);
  const bid = serviceBids.find((row) => row.id === bidId && row.request_id === requestId);
  if (!request || !bid || request.driver_id !== jwtUser.sub || request.status !== 'open') {
    return { error: 'not_found', status: 404 };
  }
  bid.driver_counter_total = Number(payload?.total);
  bid.driver_counter_eta_minutes = Number(payload?.etaMinutes || 15);
  bid.driver_counter_message = payload?.message || '';
  bid.driver_counter_at = Date.now();
  addEventMem('נהג שלח הצעה נגדית', 'activity');
  return { bid: rowToServiceBid(bid) };
}

export function reviseBidMem(jwtUser, requestId, bidId, payload) {
  if (!initialized) initMemDataStore();
  const bid = serviceBids.find((row) => row.id === bidId && row.request_id === requestId);
  if (!bid || bid.host_id !== jwtUser.sub || bid.status !== 'pending') {
    return { error: 'not_found', status: 404 };
  }
  bid.total = Number(payload?.total);
  bid.eta_minutes = Number(payload?.etaMinutes || 15);
  bid.driver_counter_total = null;
  bid.driver_counter_eta_minutes = null;
  bid.driver_counter_message = null;
  bid.driver_counter_at = null;
  addEventMem('ספק עדכן הצעה', 'activity');
  return { bid: rowToServiceBid(bid) };
}

export function acceptBidMem(jwtUser, requestId, bidId) {
  if (!initialized) initMemDataStore();
  const request = serviceRequests.find((row) => row.id === requestId);
  const bid = serviceBids.find((row) => row.id === bidId && row.request_id === requestId);
  if (!request || !bid) return { error: 'not_found', status: 404 };
  if (jwtUser.role === 'driver' && request.driver_id !== jwtUser.sub) {
    return { error: 'forbidden', status: 403 };
  }

  request.status = 'pending_provider';
  request.accepted_bid_id = bidId;
  request.host_id = bid.host_id;
  request.amount = bid.total;
  bid.status = 'accepted';
  serviceBids.filter((row) => row.request_id === requestId && row.id !== bidId).forEach((row) => {
    row.status = 'rejected';
  });
  addEventMem('נהג בחר הצעה — ממתין לאישור ספק', 'activity');
  return { request: rowToServiceRequest(request), bid: rowToServiceBid(bid) };
}

export function confirmBidMem(jwtUser, requestId) {
  if (!initialized) initMemDataStore();
  const request = serviceRequests.find((row) => row.id === requestId);
  if (!request || request.host_id !== jwtUser.sub || request.status !== 'pending_provider') {
    return { error: 'not_found', status: 404 };
  }
  request.status = 'assigned';
  addEventMem('ספק אישר את ההצעה', 'activity');
  return { request: rowToServiceRequest(request) };
}

export function declineBidMem(jwtUser, requestId) {
  if (!initialized) initMemDataStore();
  const request = serviceRequests.find((row) => row.id === requestId);
  if (!request || request.host_id !== jwtUser.sub || request.status !== 'pending_provider') {
    return { error: 'not_found', status: 404 };
  }
  const bid = serviceBids.find((row) => row.id === request.accepted_bid_id);
  request.status = 'open';
  request.accepted_bid_id = null;
  request.host_id = null;
  request.amount = 0;
  if (bid) bid.status = 'pending';
  addEventMem('ספק דחה את ההצעה', 'activity');
  return { request: rowToServiceRequest(request) };
}

export function updateTenderLocationMem(requestId, jwtUser, { lat, lng, role }) {
  if (!initialized) initMemDataStore();
  const request = serviceRequests.find((row) => row.id === requestId);
  if (!request) return { error: 'not_found', status: 404 };

  if (role === 'provider' && jwtUser.sub === request.host_id) {
    request.provider_lat = lat;
    request.provider_lng = lng;
    if (request.status === 'assigned') request.status = 'in_progress';
  } else if (role === 'driver' && jwtUser.sub === request.driver_id) {
    request.lat = lat;
    request.lng = lng;
  } else {
    return { error: 'forbidden', status: 403 };
  }
  return { request: rowToServiceRequest(request) };
}

export function completeTenderMem(jwtUser, requestId) {
  if (!initialized) initMemDataStore();
  const request = serviceRequests.find((row) => row.id === requestId);
  if (!request) return { error: 'not_found', status: 404 };
  if (jwtUser.role !== 'host' || request.host_id !== jwtUser.sub) {
    return { error: 'forbidden', status: 403 };
  }

  request.status = 'completed';
  request.completed_at = Date.now();
  const platformFee = Number((request.amount * settings.commission / 100).toFixed(2));
  const hostShare = Number((request.amount - platformFee).toFixed(2));
  transactions.unshift({
    id: createId('tx'),
    booking_id: null,
    station_id: null,
    driver_id: request.driver_id,
    host_id: request.host_id,
    amount: request.amount,
    host_share: hostShare,
    platform_fee: platformFee,
    kwh: 0,
    status: 'paid_mock',
    created_at: Date.now(),
  });
  addEventMem(`שירות חירום הושלם · ${request.amount}₪`, 'activity');
  return { request: rowToServiceRequest(request) };
}

function memPaymentRow(payment) {
  return {
    id: payment.id,
    reference_type: payment.referenceType,
    reference_id: payment.referenceId,
    payer_id: payment.payerId,
    host_id: payment.hostId,
    title: payment.title,
    amount: payment.amount,
    platform_fee: payment.platformFee,
    host_share: payment.hostShare,
    currency: payment.currency || 'ILS',
    status: payment.status,
    gateway: payment.gateway || 'tranzila',
    gateway_txn_id: payment.gatewayTxnId || null,
    created_at: payment.createdAt,
    paid_at: payment.paidAt || null,
    splits: payment.splits || [],
  };
}

export function listPaymentsMem(user) {
  if (!initialized) initMemDataStore();
  let rows = payments.map((row) => rowToPayment(memPaymentRow(row)));
  if (!user) return rows;
  if (user.role === 'driver') rows = rows.filter((p) => p.payerId === user.sub);
  if (user.role === 'host') rows = rows.filter((p) => p.hostId === user.sub);
  return rows;
}

export function paymentSummaryMem(user) {
  const rows = listPaymentsMem(user).filter((p) => p.status === 'paid');
  if (user.role === 'admin') {
    return {
      count: rows.length,
      volume: rows.reduce((s, p) => s + p.amount, 0),
      platformFees: rows.reduce((s, p) => s + p.platformFee, 0),
      hostPayouts: rows.reduce((s, p) => s + p.hostShare, 0),
      pendingPayouts: 0,
    };
  }
  if (user.role === 'host') {
    const earned = rows.reduce((s, p) => s + p.hostShare, 0);
    return { count: rows.length, earned, settled: earned, pendingPayouts: 0 };
  }
  return { count: rows.length, spent: rows.reduce((s, p) => s + p.amount, 0) };
}

export function listPaymentMethodsMem(userId) {
  if (!initialized) initMemDataStore();
  return paymentMethods.filter((m) => m.user_id === userId).map(rowToPaymentMethod);
}

export function savePaymentMethodMem(userId, method) {
  if (!initialized) initMemDataStore();
  if (method.isDefault) {
    paymentMethods.forEach((m) => {
      if (m.user_id === userId) m.is_default = false;
    });
  }
  const row = {
    id: method.id,
    user_id: userId,
    provider: 'tranzila',
    token: method.token,
    card_last4: method.cardLast4,
    card_brand: method.cardBrand || 'visa',
    is_default: !!method.isDefault,
    created_at: method.createdAt || Date.now(),
  };
  paymentMethods.unshift(row);
  return rowToPaymentMethod(row);
}

export function createPaymentMem(payerId, payload) {
  if (!initialized) initMemDataStore();
  const id = createId('pay');
  const now = Date.now();
  const splits = (payload.splits || []).map((split, index) => ({
    id: createId(`split-${index}`),
    payment_id: id,
    split_type: split.splitType,
    recipient_id: split.recipientId,
    card_last4: split.cardLast4,
    card_brand: split.cardBrand,
    amount: split.amount,
    status: 'pending',
    gateway_txn_id: null,
    created_at: now,
  }));
  const payment = {
    id,
    referenceType: payload.referenceType,
    referenceId: payload.referenceId,
    payerId,
    hostId: payload.hostId,
    title: payload.title,
    amount: payload.amount,
    platformFee: payload.platformFee,
    hostShare: payload.hostShare,
    currency: 'ILS',
    status: 'pending',
    gateway: 'tranzila',
    gatewayTxnId: null,
    createdAt: now,
    paidAt: null,
    splits,
    cardSplits: payload.cardSplits || [],
  };
  payments.unshift(payment);
  return rowToPayment(memPaymentRow(payment));
}

export function updatePaymentSplitsMem(paymentId, payerId, cardSplits) {
  if (!initialized) initMemDataStore();
  const payment = payments.find((p) => p.id === paymentId && p.payerId === payerId);
  if (!payment) return null;
  const total = cardSplits.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  if (Math.abs(total - payment.amount) > 0.01) return null;
  payment.splits = payment.splits.filter((s) => s.split_type !== 'card_charge');
  const now = Date.now();
  for (const item of cardSplits) {
    payment.splits.unshift({
      id: createId('split'),
      payment_id: paymentId,
      split_type: 'card_charge',
      recipient_id: null,
      card_last4: item.cardLast4,
      card_brand: item.cardBrand || 'visa',
      amount: Number(item.amount),
      status: 'pending',
      gateway_txn_id: null,
      created_at: now,
    });
  }
  payment.cardSplits = cardSplits;
  return rowToPayment(memPaymentRow(payment));
}

export function markSplitPaidMem(paymentId, splitIndex, txnId) {
  if (!initialized) initMemDataStore();
  const payment = payments.find((p) => p.id === paymentId);
  if (!payment) return null;
  const chargeSplits = payment.splits.filter((s) => s.split_type === 'card_charge');
  const split = chargeSplits[splitIndex];
  if (split) {
    split.status = 'paid';
    split.gateway_txn_id = txnId;
  }
  if (chargeSplits.every((s) => s.status === 'paid')) {
    payment.status = 'paid';
    payment.gatewayTxnId = txnId;
    payment.paidAt = Date.now();
    payment.splits.filter((s) => s.split_type !== 'card_charge').forEach((s) => {
      s.status = 'settled';
    });
  }
  return rowToPayment(memPaymentRow(payment));
}

export function executePaymentMem(paymentId, payerId, { cardSplits, cardNumber, expiry, cvv, holder } = {}) {
  if (!initialized) initMemDataStore();
  const payment = payments.find((p) => p.id === paymentId && p.payerId === payerId);
  if (!payment) return { error: 'not_found', status: 404, detail: 'תשלום לא נמצא' };
  if (payment.status === 'paid') return { ok: true, payment: rowToPayment(memPaymentRow(payment)) };

  let cards = cardSplits || payment.cardSplits || [];
  if (!cards.length && cardNumber) {
    const last4 = String(cardNumber).slice(-4);
    cards = [{ cardLast4: last4, cardBrand: String(cardNumber).startsWith('5') ? 'mastercard' : 'visa', amount: payment.amount, token: createId('tok') }];
  }

  const chargeSplits = payment.splits.filter((s) => s.split_type === 'card_charge');
  for (let i = 0; i < chargeSplits.length; i += 1) {
    chargeSplits[i].status = 'paid';
    chargeSplits[i].gateway_txn_id = `tz-mock-${createId('tx')}`;
  }
  payment.splits.filter((s) => s.split_type !== 'card_charge').forEach((s) => {
    s.status = 'settled';
  });
  payment.status = 'paid';
  payment.gatewayTxnId = chargeSplits[0]?.gateway_txn_id || `tz-mock-${createId('tx')}`;
  payment.paidAt = Date.now();
  addEventMem(`תשלום ₪${payment.amount} בוצע · Tranzila`, 'activity');
  return { ok: true, payment: rowToPayment(memPaymentRow(payment)) };
}
