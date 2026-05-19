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
  { id: 'current', label: 'המיקום שלי עכשיו', distanceOffset: 0, note: 'GPS פעיל' },
  { id: 'office', label: 'משרד בתל אביב', distanceOffset: 0.6, note: 'סימולציית מיקום' },
  { id: 'home', label: 'בית ברמת השרון', distanceOffset: -0.3, note: 'סימולציית מיקום' },
];
