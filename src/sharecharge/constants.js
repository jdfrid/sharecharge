import { Navigation, Home, ShieldCheck } from 'lucide-react';

export const STORAGE_KEY = 'sharecharge-app-state-v1';

export const SHARECHARGE_ROLE_KEYS = /** @type {const} */ ({
  client: 'client',
  provider: 'provider',
  system: 'system',
});

/** @typedef {'client'|'provider'|'system'} ShareChargePortalRole */

export const statusLabels = {
  pending: 'ממתין לאישור ספק',
  approved: 'אושר על ידי הספק',
  on_way: 'הנהג בדרך',
  otp_verified: 'OTP אומת',
  charging: 'טעינה פעילה',
  completed: 'הושלם ושולם',
  rejected: 'נדחה',
  cancelled: 'בוטל',
  open: 'ממתין להצעות',
  assigned: 'ספק נבחר',
  in_progress: 'בדרך אליך',
};

export const statusStyles = {
  pending: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
  approved: 'bg-blue-100 text-blue-800 ring-1 ring-blue-200',
  on_way: 'bg-cyan-100 text-cyan-800 ring-1 ring-cyan-200',
  otp_verified: 'bg-violet-100 text-violet-800 ring-1 ring-violet-200',
  charging: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200',
  completed: 'bg-slate-900 text-white ring-1 ring-slate-800',
  rejected: 'bg-red-100 text-red-800 ring-1 ring-red-200',
  cancelled: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
  open: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
  assigned: 'bg-blue-100 text-blue-800 ring-1 ring-blue-200',
  in_progress: 'bg-cyan-100 text-cyan-800 ring-1 ring-cyan-200',
};

export const roleEntryConfig = {
  client: {
    title: 'כניסת לקוח',
    subtitle: 'מצא עמדה, הזמן, אמת OTP וצפה בהזמנה',
    cta: 'כניסה כאפליקציית לקוח',
    email: 'driver@sharecharge.app',
    icon: Navigation,
    gradient: 'from-blue-500 via-cyan-500 to-teal-400',
    points: ['עמדות זמינות סביבך', 'רשימה ומפה', 'תשלום וחשבונית'],
  },
  provider: {
    title: 'כניסת ספק',
    subtitle: 'עדכן מחיר ותנאים, אשר הזמנות וצפה בעסקאות',
    cta: 'כניסה כאפליקציית ספק',
    email: 'host@sharecharge.app',
    icon: Home,
    gradient: 'from-sky-600 via-blue-600 to-teal-500',
    points: ['ניהול עמדות', 'אישור בקשות', 'הכנסות ועמלות'],
  },
  system: {
    title: 'כניסת מנהל מערכת',
    subtitle: 'הקמת ספקים, לקוחות ועמדות — דוחות ופיקוח',
    cta: 'כניסה לסביבת ניהול',
    email: 'admin@sharecharge.app',
    icon: ShieldCheck,
    gradient: 'from-slate-900 via-blue-900 to-teal-600',
    points: ['יצירת ישויות', 'מחלוקות וחסימות', 'אירועי מערכת'],
  },
};

export const driverLocationProfiles = [
  { id: 'current', label: 'המיקום שלי (GPS)', distanceOffset: 0, note: 'מיקום אמיתי מהמכשיר' },
  { id: 'office', label: 'משרד בתל אביב', lat: 32.0853, lng: 34.7818, distanceOffset: 0, note: 'נקודת ייחוס לדוגמה' },
  { id: 'home', label: 'בית ברמת השרון', lat: 32.1378, lng: 34.8403, distanceOffset: 0, note: 'נקודת ייחוס לדוגמה' },
];

export const SERVICE_CATEGORIES = {
  charging: {
    id: 'charging',
    label: 'טעינה',
    path: '/client/charging/map',
    discoverTitle: 'עמדות טעינה',
    unitLabel: 'kWh',
  },
  bakery: {
    id: 'bakery',
    label: 'פנצריה',
    path: '/client/services/bakery',
    discoverTitle: 'פנצריות בסביבה',
    unitLabel: 'מוצר',
  },
  tow: {
    id: 'tow',
    label: 'גרר',
    path: '/client/services/tow',
    discoverTitle: 'שירותי גרירה',
    unitLabel: 'קריאה',
  },
  garage: {
    id: 'garage',
    label: 'מוסך',
    path: '/client/services/garage',
    discoverTitle: 'מוסכים בסביבה',
    unitLabel: 'שעה',
  },
};

export const SERVICE_NAV_LINKS = [
  SERVICE_CATEGORIES.bakery,
  SERVICE_CATEGORIES.tow,
  SERVICE_CATEGORIES.garage,
];

export const EMERGENCY_CATEGORIES = {
  flat_tire: {
    id: 'flat_tire',
    label: "פנצ'ר",
    icon: 'flat-tire.png',
    path: '/client/emergency?category=flat_tire',
  },
  fuel: { id: 'fuel', label: 'דלק', icon: 'fuel.png', path: '/client/emergency?category=fuel' },
  tow: { id: 'tow', label: 'גרר', icon: 'tow.png', path: '/client/emergency?category=tow' },
  battery: {
    id: 'battery',
    label: 'מוסך · מצבר',
    icon: 'garage.png',
    path: '/client/emergency?category=battery',
  },
};

export const EMERGENCY_NAV_TILES = [
  EMERGENCY_CATEGORIES.flat_tire,
  EMERGENCY_CATEGORIES.fuel,
  EMERGENCY_CATEGORIES.tow,
  EMERGENCY_CATEGORIES.battery,
];

export const tenderStatusLabels = {
  open: 'ממתין להצעות',
  pending_provider: 'ממתין לאישור ספק',
  assigned: 'ספק אישר — בדרך',
  in_progress: 'בדרך אליך',
  completed: 'הושלם',
  cancelled: 'בוטל',
};
