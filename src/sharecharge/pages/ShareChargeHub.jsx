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
    { label: 'מנהל מערכת — לוח בקרה', path: SHARECHARGE_DEEP_LINKS.opsApp },
  ];

  return (
    <div dir="rtl" className="sc-skin sc-no-motion min-h-screen bg-[var(--sc-bg)] text-sc-text">
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col overflow-hidden px-4 py-[calc(1rem+env(safe-area-inset-top,0px))] pb-10">
        <div className="pointer-events-none absolute -right-28 top-0 h-72 w-72 rounded-full bg-indigo-400/25 blur-3xl" />
        <div className="pointer-events-none absolute -left-28 top-56 h-72 w-72 rounded-full bg-teal-300/30 blur-3xl" />

        <header className="relative z-10 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--sc-accent)]">ShareCharge</p>
            <h1 className="mt-1 text-3xl font-black leading-tight tracking-tight text-[var(--sc-text)]">
              בחירת אפליקציה
            </h1>
            <p className="mt-2 text-sm font-bold text-sc-muted">לקוח · ספק · מנהל מערכת — כל אחד בנתיב נפרד.</p>
          </div>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.25rem] bg-gradient-to-br from-[var(--sc-accent)] to-teal-500 p-3 text-white shadow-sc-card ring-2 ring-white/40">
            <CheckCircle size={26} />
          </div>
        </header>

        <section className="relative z-10 mt-6 overflow-hidden rounded-sc-lg border border-white/60 bg-white/90 p-4 shadow-sc-card backdrop-blur-sm">
          <div className="relative h-36 overflow-hidden rounded-sc-md bg-gradient-to-br from-indigo-100/80 via-white to-teal-50 ring-1 ring-slate-100">
            <img src="/sharecharge-logo.png" alt="" className="h-full w-full object-cover opacity-90" />
            <div className="absolute inset-x-3 bottom-3 rounded-sc-md border border-white/70 bg-white/95 p-3 shadow-sm">
              <p className="text-sm font-black text-sc-text">מראה מעודכן · PWA · נתונים מקושרים לאימייל הכניסה</p>
              <p className="mt-1 text-xs font-bold text-sc-muted">הדביקו את הקישורים למטה בדפדפן או שלחו לטלפון.</p>
            </div>
          </div>
        </section>

        <div className="relative z-10 mt-4 rounded-sc-lg border border-indigo-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wider text-[var(--sc-accent)]">קישורים ישירים (Hash Router)</p>
          <ul className="mt-3 space-y-2 text-xs">
            {linkRows.map(({ label, path }) => (
              <li key={path} className="rounded-sc-sm bg-slate-50/90 px-3 py-2 ring-1 ring-slate-100">
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
                className="group flex items-center gap-4 rounded-sc-lg border border-white/70 bg-white p-4 shadow-sc-card ring-1 ring-indigo-100/60"
              >
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${item.gradient} text-white shadow-md`}
                >
                  <Icon size={25} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-black">{item.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-sc-muted">{item.subtitle}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--sc-surface)] text-[var(--sc-accent)]">
                  <ChevronLeft size={20} />
                </div>
              </Link>
            );
          })}
        </div>

        <p className="relative z-10 mt-6 rounded-sc-md border border-slate-700/50 bg-gradient-to-l from-slate-900 to-slate-800 p-4 text-sm leading-7 text-white/90 shadow-sc-card">
          פאנל <span className="font-black text-amber-200">/admin</span> (מבצעים) נשאר נפרד.
        </p>
      </div>
    </div>
  );
}
