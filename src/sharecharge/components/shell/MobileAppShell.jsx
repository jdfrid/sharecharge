import { Link, NavLink } from 'react-router-dom';
import { Zap } from 'lucide-react';

const heroSurface = {
  client: 'bg-gradient-to-br from-[var(--sc-surface)] via-white to-teal-50/90',
  provider: 'bg-gradient-to-br from-indigo-50 via-white to-[var(--sc-surface)]',
  system: 'bg-gradient-to-br from-midnight-900 via-midnight-800 to-midnight-950 text-white',
};

export function MobileAppShell({
  portal,
  title,
  subtitle,
  children,
  onExit,
  exitLabel = 'יציאה',
  bottomNav = [],
  actions,
  homeTo = '/sharecharge',
}) {
  const hero = heroSurface[portal] || heroSurface.client;
  const isDarkHero = portal === 'system';

  const hasDock = bottomNav.length > 0;

  return (
    <div
      dir="rtl"
      className={`app-stage sc-skin relative min-h-screen text-sc-text ${
        hasDock ? 'pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))]' : 'pb-[calc(1rem+env(safe-area-inset-bottom,0px))]'
      }`}
    >
      <div className="app-device relative mx-auto min-h-screen max-w-md overflow-x-hidden">
        <header
          className={`app-hero relative overflow-hidden px-5 pb-12 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] ${hero}`}
        >
          {!isDarkHero && (
            <>
              <div className="pointer-events-none absolute -right-16 top-4 h-48 w-48 rounded-full bg-[var(--sc-accent)]/15 blur-3xl" />
              <div className="pointer-events-none absolute -left-20 bottom-2 h-56 w-56 rounded-full bg-teal-300/20 blur-3xl" />
            </>
          )}
          {isDarkHero && (
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(79,134,247,0.25),transparent_50%)]" />
          )}

          <div className="relative z-10 flex items-center justify-between gap-3">
            <Link
              to={homeTo}
              className={`flex h-12 w-12 items-center justify-center rounded-sc-md shadow-lg ${
                isDarkHero ? 'bg-white/10 text-white ring-1 ring-white/20' : 'bg-[var(--sc-accent)] text-white shadow-sc-card'
              }`}
              aria-label="מסך בחירת אפליקציה"
            >
              <Zap size={24} />
            </Link>
            <div className="min-w-0 flex-1">
              <p className={`text-xs font-black uppercase tracking-[0.2em] ${isDarkHero ? 'text-white/60' : 'text-sc-muted'}`}>
                ShareCharge
              </p>
              <h1 className={`mt-0.5 truncate text-2xl font-black tracking-tight ${isDarkHero ? 'text-white' : 'text-sc-text'}`}>
                {title}
              </h1>
              <p className={`mt-0.5 truncate text-sm font-bold ${isDarkHero ? 'text-white/70' : 'text-sc-muted'}`}>{subtitle}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {actions}
              {onExit && (
                <button
                  type="button"
                  onClick={onExit}
                  className={`rounded-sc-sm px-3 py-2 text-xs font-black ring-1 backdrop-blur ${
                    isDarkHero ? 'bg-white/10 text-white ring-white/20' : 'bg-white/90 text-sc-text ring-slate-200/80'
                  }`}
                >
                  {exitLabel}
                </button>
              )}
            </div>
          </div>

          <div className={`relative z-10 mt-5 grid grid-cols-3 gap-2 text-center ${isDarkHero ? 'text-white' : ''}`}>
            <div
              className={`rounded-sc-md p-2.5 ${
                isDarkHero ? 'bg-white/10 ring-1 ring-white/10' : 'bg-white/80 ring-1 ring-slate-100 shadow-sm'
              }`}
            >
              <p className="text-lg font-black">{portal === 'client' ? 'לקוח' : portal === 'provider' ? 'ספק' : 'ניהול'}</p>
              <p className={`text-[10px] font-bold ${isDarkHero ? 'text-white/65' : 'text-sc-muted'}`}>מצב פעיל</p>
            </div>
            <div
              className={`rounded-sc-md p-2.5 ${
                isDarkHero ? 'bg-white/10 ring-1 ring-white/10' : 'bg-white/80 ring-1 ring-slate-100 shadow-sm'
              }`}
            >
              <p className="text-lg font-black">Live</p>
              <p className={`text-[10px] font-bold ${isDarkHero ? 'text-white/65' : 'text-sc-muted'}`}>דמו מקומי</p>
            </div>
            <div
              className={`rounded-sc-md p-2.5 ${
                isDarkHero ? 'bg-[var(--sc-accent)] text-white' : 'bg-[var(--sc-accent)] text-white shadow-sc-card'
              }`}
            >
              <p className="text-lg font-black">OTP</p>
              <p className={`text-[10px] font-bold ${isDarkHero ? 'text-white/90' : 'text-white/90'}`}>מאובטח</p>
            </div>
          </div>
        </header>

        <main className="relative z-10 -mt-8 space-y-4 px-4">{children}</main>

        {hasDock && (
          <nav className="bottom-dock fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-md justify-around gap-1 rounded-t-sc-lg bg-white/95 px-2 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-2 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/60 backdrop-blur-xl">
            {bottomNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex min-w-[4.5rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-sc-sm px-2 py-2 text-[10px] font-black transition ${
                      isActive ? 'bg-[var(--sc-accent)]/12 text-[var(--sc-accent)]' : 'text-sc-muted hover:text-sc-text'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={20} className={isActive ? 'text-[var(--sc-accent)]' : 'text-current'} />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
}
