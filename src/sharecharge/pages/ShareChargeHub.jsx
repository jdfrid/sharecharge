import { Link } from 'react-router-dom';
import { CheckCircle, ChevronLeft } from 'lucide-react';
import { roleEntryConfig, SHARECHARGE_ROLE_KEYS } from '../constants';
import { SHARECHARGE_DEEP_LINKS, shareChargeHashUrl } from '../deepLinks';

const cards = [
  { portal: SHARECHARGE_ROLE_KEYS.client, to: '/client/entry' },
  { portal: SHARECHARGE_ROLE_KEYS.provider, to: '/provider/entry' },
  { portal: SHARECHARGE_ROLE_KEYS.system, to: '/ops/entry' },
];

export function ShareChargeHub() {
  const linkRows = [
    { label: 'לקוח — כניסה', path: SHARECHARGE_DEEP_LINKS.clientEntry },
    { label: 'לקוח — אפליקציה (אחרי התחברות)', path: SHARECHARGE_DEEP_LINKS.clientApp },
    { label: 'ספק — כניסה', path: SHARECHARGE_DEEP_LINKS.providerEntry },
    { label: 'ספק — אפליקציה', path: SHARECHARGE_DEEP_LINKS.providerApp },
    { label: 'מנהל מערכת — כניסה', path: SHARECHARGE_DEEP_LINKS.opsEntry },
    { label: 'מנהל מערכת — קונסול (מחשב)', path: SHARECHARGE_DEEP_LINKS.opsConsole },
    { label: 'מנהל מערכת — לוח בקרה (מובייל)', path: SHARECHARGE_DEEP_LINKS.opsApp },
  ];

  return (
    <div dir="rtl" className="sc-skin sc-no-motion min-h-screen bg-[var(--sc-bg)] text-sc-text">
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col overflow-hidden px-4 py-[calc(1rem+env(safe-area-inset-top,0px))] pb-10">
        <div className="pointer-events-none absolute -right-20 top-0 h-48 w-48 rounded-full bg-[var(--sc-accent)]/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 top-40 h-56 w-56 rounded-full bg-[var(--sc-accent-2)]/10 blur-3xl" />

        <header className="relative z-10 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--sc-accent)]">ShareCharge</p>
            <h1 className="mt-1 text-3xl font-black leading-tight tracking-tight text-[var(--sc-text)]">בחירת אפליקציה</h1>
            <p className="mt-2 text-sm font-bold text-sc-muted">לקוח · ספק · מנהל מערכת — כל אחד בנתיב נפרד.</p>
          </div>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-sc-md bg-gradient-to-br from-[var(--sc-accent)] to-[var(--sc-accent-2)] p-3 text-white shadow-sc-card">
            <CheckCircle size={26} />
          </div>
        </header>

        <section className="relative z-10 mt-6 overflow-hidden rounded-sc-lg border border-white/90 bg-white/72 p-4 shadow-sc-card backdrop-blur-xl">
          <div className="relative h-36 overflow-hidden rounded-sc-md border border-sc-border bg-gradient-to-br from-[var(--sc-surface)] to-white">
            <img src="/sharecharge-logo.png" alt="" className="h-full w-full object-cover opacity-90" />
            <div className="absolute inset-x-3 bottom-3 rounded-sc-md border border-sc-border bg-white p-3 shadow-sm">
              <p className="text-sm font-black text-sc-text">ממשק עדכני · PWA · נתונים מקושרים לאימייל הכניסה</p>
              <p className="mt-1 text-xs font-bold text-sc-muted">הדביקו את הקישורים למטה בדפדפן או שלחו לטלפון.</p>
            </div>
          </div>
        </section>

        <div className="relative z-10 mt-4 rounded-sc-lg border border-white/90 bg-white/72 p-4 shadow-sm backdrop-blur-xl">
          <p className="text-xs font-black uppercase tracking-wider text-[var(--sc-accent)]">קישורים ישירים (Hash Router)</p>
          <ul className="mt-3 space-y-2 text-xs">
            {linkRows.map(({ label, path }) => (
              <li key={path} className="rounded-sc-sm border border-sc-border bg-sc-surface px-3 py-2">
                <span className="font-bold text-sc-text">{label}</span>
                <div className="mt-1 break-all font-mono text-[11px] text-sc-muted" dir="ltr">
                  {shareChargeHashUrl(path)}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 mt-5 flex flex-1 flex-col gap-3">
          {cards.map(({ portal, to }) => {
            const item = roleEntryConfig[portal];
            const Icon = item.icon;
            return (
              <Link
                key={portal}
                to={to}
                className="group flex items-center gap-4 rounded-sc-lg border border-white/90 bg-white/75 p-4 shadow-sc-card backdrop-blur-md"
              >
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-sc-md bg-gradient-to-br ${item.gradient} text-white shadow-md`}
                >
                  <Icon size={25} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-black">{item.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-sc-muted">{item.subtitle}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-sc-md bg-[var(--sc-surface)] text-[var(--sc-accent)] ring-1 ring-sc-border">
                  <ChevronLeft size={20} />
                </div>
              </Link>
            );
          })}
        </div>

        <p className="relative z-10 mt-6 rounded-sc-lg border border-white/80 bg-gradient-to-br from-slate-900 via-blue-950/90 to-slate-900 p-4 text-sm leading-7 text-white/95 shadow-sc-card backdrop-blur-sm">
          <span className="font-black text-cyan-300">קונסול ניהול (מחשב):</span>{' '}
          <span className="font-mono text-[11px] text-white/80" dir="ltr">
            {shareChargeHashUrl(SHARECHARGE_DEEP_LINKS.opsConsole)}
          </span>
          <span className="mt-2 block text-white/70">OTP מנהל → מחיקה וניקוי נתוני בדיקות</span>
        </p>
      </div>
    </div>
  );
}
