import { statusLabels, tenderStatusLabels } from '../../../constants';
import { SERVICE_CATEGORY_LABELS } from '../../../utils/serviceCategories';

const bookingStatuses = Object.entries(statusLabels)
  .filter(([key]) => !['open', 'assigned', 'in_progress'].includes(key))
  .map(([value, label]) => ({ value, label }));

const tenderStatuses = Object.entries(tenderStatusLabels).map(([value, label]) => ({ value, label }));

const bidStatuses = [
  { value: 'pending', label: 'ממתין' },
  { value: 'accepted', label: 'אושר' },
  { value: 'rejected', label: 'נדחה' },
  { value: 'countered', label: 'הצעה נגדית' },
  { value: 'expired', label: 'פג תוקף' },
];

const disputeStatuses = [
  { value: 'open', label: 'פתוח' },
  { value: 'resolved', label: 'נסגר' },
];

const paymentStatuses = [
  { value: 'pending', label: 'ממתין' },
  { value: 'paid', label: 'שולם' },
  { value: 'failed', label: 'נכשל' },
  { value: 'refunded', label: 'הוחזר' },
];

const stationCategories = Object.entries(SERVICE_CATEGORY_LABELS).map(([value, label]) => ({ value, label }));

const emergencyCategories = [
  { value: 'flat_tire', label: "פנצ'ר" },
  { value: 'fuel', label: 'דלק' },
  { value: 'tow', label: 'גרר' },
  { value: 'battery', label: 'מצבר / מוסך' },
];

export function userEditSchema() {
  return [
    { key: 'name', label: 'שם', type: 'text', required: true },
    { key: 'email', label: 'אימייל', type: 'email', required: true },
    { key: 'phone', label: 'טלפון', type: 'text' },
    { key: 'verified', label: 'מאומת', type: 'checkbox' },
    { key: 'blocked', label: 'חסום', type: 'checkbox' },
  ];
}

export function userCreateSchema() {
  return [
    { key: 'name', label: 'שם', type: 'text', required: true },
    { key: 'email', label: 'אימייל', type: 'email', required: true },
  ];
}

export function stationEditSchema(hostOptions = []) {
  return [
    { key: 'name', label: 'שם', type: 'text', required: true },
    { key: 'address', label: 'כתובת', type: 'text', required: true },
    { key: 'hostId', label: 'ספק', type: 'select', options: hostOptions, required: true },
    { key: 'serviceCategory', label: 'סוג שירות', type: 'select', options: stationCategories },
    { key: 'lat', label: 'קו רוחב', type: 'number' },
    { key: 'lng', label: 'קו אורך', type: 'number' },
    { key: 'power', label: 'הספק (kW)', type: 'number' },
    { key: 'plug', label: 'שקע', type: 'text' },
    { key: 'pricePerKwh', label: 'מחיר ל-kWh', type: 'number' },
    { key: 'available', label: 'זמין', type: 'checkbox' },
    { key: 'termsText', label: 'תנאים', type: 'textarea' },
  ];
}

export function stationCreateSchema(hostOptions = []) {
  return stationEditSchema(hostOptions).filter((f) => f.key !== 'available');
}

export function bookingEditSchema(stationOptions = [], userOptions = []) {
  return [
    { key: 'status', label: 'סטטוס', type: 'select', options: bookingStatuses, required: true },
    { key: 'stationId', label: 'עמדה', type: 'select', options: stationOptions },
    { key: 'driverId', label: 'לקוח', type: 'select', options: userOptions },
    { key: 'hostId', label: 'ספק', type: 'select', options: userOptions },
    { key: 'amount', label: 'סכום (₪)', type: 'number' },
    { key: 'kwh', label: 'kWh', type: 'number' },
    { key: 'durationHours', label: 'משך (שעות)', type: 'number' },
  ];
}

export function tenderEditSchema(userOptions = []) {
  return [
    { key: 'status', label: 'סטטוס', type: 'select', options: tenderStatuses, required: true },
    { key: 'category', label: 'סוג חירום', type: 'select', options: emergencyCategories },
    { key: 'addressText', label: 'כתובת', type: 'text' },
    { key: 'problemDescription', label: 'תיאור הבעיה', type: 'textarea' },
    { key: 'phone', label: 'טלפון', type: 'text' },
    { key: 'lat', label: 'קו רוחב', type: 'number' },
    { key: 'lng', label: 'קו אורך', type: 'number' },
    { key: 'amount', label: 'סכום (₪)', type: 'number' },
    { key: 'driverId', label: 'לקוח', type: 'select', options: userOptions },
    { key: 'hostId', label: 'ספק', type: 'select', options: userOptions },
    { key: 'notifyRadiusKm', label: 'רדיוס התראה (ק"מ)', type: 'number' },
  ];
}

export function bidEditSchema(userOptions = []) {
  return [
    { key: 'status', label: 'סטטוס', type: 'select', options: bidStatuses, required: true },
    { key: 'hostId', label: 'ספק', type: 'select', options: userOptions },
    { key: 'total', label: 'סכום (₪)', type: 'number' },
    { key: 'etaMinutes', label: 'זמן הגעה (דקות)', type: 'number' },
    { key: 'driverCounterTotal', label: 'הצעה נגדית — סכום', type: 'number' },
    { key: 'driverCounterEtaMinutes', label: 'הצעה נגדית — ETA', type: 'number' },
    { key: 'driverCounterMessage', label: 'הצעה נגדית — הודעה', type: 'textarea' },
  ];
}

export function disputeEditSchema() {
  return [
    { key: 'status', label: 'סטטוס', type: 'select', options: disputeStatuses, required: true },
    { key: 'reason', label: 'סיבה', type: 'textarea', required: true },
  ];
}

export function paymentEditSchema(userOptions = []) {
  return [
    { key: 'status', label: 'סטטוס', type: 'select', options: paymentStatuses, required: true },
    { key: 'title', label: 'תיאור', type: 'text' },
    { key: 'amount', label: 'סכום (₪)', type: 'number' },
    { key: 'payerId', label: 'משלם', type: 'select', options: userOptions },
    { key: 'hostId', label: 'ספק', type: 'select', options: userOptions },
  ];
}

export function buildUserOptions(users = [], role) {
  return users
    .filter((u) => !role || u.role === role)
    .map((u) => ({ value: u.id, label: `${u.name} (${u.email})` }));
}

export function buildStationOptions(stations = []) {
  return stations.map((s) => ({ value: s.id, label: `${s.name} — ${s.address}` }));
}

export function serializeFormValues(schema, row = {}) {
  const values = {};
  for (const field of schema) {
    const raw = row[field.key];
    if (field.type === 'checkbox') values[field.key] = Boolean(raw);
    else if (field.type === 'number') values[field.key] = raw != null && raw !== '' ? Number(raw) : '';
    else values[field.key] = raw ?? '';
  }
  return values;
}

export function parseFormPayload(schema, values) {
  const payload = {};
  for (const field of schema) {
    const raw = values[field.key];
    if (raw === '' || raw === undefined) continue;
    if (field.type === 'checkbox') payload[field.key] = Boolean(raw);
    else if (field.type === 'number') {
      const num = Number(raw);
      if (!Number.isNaN(num)) payload[field.key] = num;
    } else payload[field.key] = String(raw).trim();
  }
  return payload;
}
