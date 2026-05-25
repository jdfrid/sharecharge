import { Link, NavLink } from 'react-router-dom';
import { Zap } from 'lucide-react';

const heroSurface = {
  client: 'app-hero--client bg-gradient-to-br from-[#e8f4ff] via-[#f0f9ff] to-[#e6fffa] text-sc-text',
  provider: 'app-hero--provider bg-gradient-to-br from-[#e0f2fe] via-[#ecfeff] to-[#f0fdf4] text-sc-text',
  system: 'app-hero--dark bg-gradient-to-br from-midnight-900 via-midnight-800 to-midnight-950 text-white',
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
          data-hero={isDarkHero ? undefined : 'brand'}
          className={`app-hero relative overflow-hidden px-5 pb-8 pt-[calc(1rem+env(safe-area-inset-top,0px))] ${hero}`}
        >
          {isDarkHero && (
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(79,134,247,0.25),transparent_50%)]" />
          )}

          <div className="relative z-10 flex items-center justify-between gap-3">
            <Link
              to={homeTo}
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-sc-md bg-gradient-to-br from-[#007bff] via-[#0095ff] to-[#00d1c1] text-white shadow-sc-card ${
                isDarkHero ? 'shadow-lg ring-1 ring-white/15' : ''
              }`}
              aria-label="מסך בחירת אפליקציה"
            >
              <Zap size={24} />
            </Link>
            <div className="min-w-0 flex-1">
              {isDarkHero ? (
                <>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-white/55">ShareCharge</p>
                  <h1 className="mt-0.5 truncate text-2xl font-black tracking-tight text-white">{title}</h1>
                  <p className="mt-0.5 truncate text-sm font-bold text-white/75">{subtitle}</p>
                </>
              ) : (
                <>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--sc-accent)]">ShareCharge</p>
                  <h1 className="mt-0.5 truncate text-2xl font-black tracking-tight text-sc-text">{title}</h1>
                  <p className="mt-0.5 truncate text-sm font-bold text-sc-muted">{subtitle}</p>
                </>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {actions}
              {onExit && (
                <button
                  type="button"
                  onClick={onExit}
                  className={
                    isDarkHero
                      ? 'rounded-sc-sm border border-white/25 bg-white/10 px-3 py-2 text-xs font-black text-white shadow-sm ring-transparent backdrop-blur'
                      : 'rounded-sc-sm border border-white/80 bg-white/70 px-3 py-2 text-xs font-black text-sc-text shadow-sm backdrop-blur-md'
                  }
                >
                  {exitLabel}
                </button>
              )}
            </div>
          </div>

          <div
            className={`relative z-10 mt-4 grid grid-cols-3 gap-2 text-center ${
              isDarkHero ? 'text-white' : 'text-sc-text'
            }`}
          >
            <div
              className={`rounded-sc-md border p-2.5 shadow-sm backdrop-blur-md ${
                isDarkHero ? 'border-white/15 bg-white/10' : 'border-white/90 bg-white/65'
              }`}
            >
              <p className="text-base font-black">{portal === 'client' ? 'לקוח' : portal === 'provider' ? 'ספק' : 'ניהול'}</p>
              <p className={`text-[10px] font-bold ${isDarkHero ? 'text-white/65' : 'text-sc-muted'}`}>מצב פעיל</p>
            </div>
            <div
              className={`rounded-sc-md border p-2.5 shadow-sm backdrop-blur-md ${
                isDarkHero ? 'border-white/15 bg-white/10' : 'border-white/90 bg-white/65'
              }`}
            >
              <p className="text-base font-black">סנכרון</p>
              <p className={`text-[10px] font-bold ${isDarkHero ? 'text-white/65' : 'text-sc-muted'}`}>בזמן אמת</p>
            </div>
            <div className="rounded-sc-md border border-transparent bg-gradient-to-br from-[#007bff] to-[#00d1c1] p-2.5 text-white shadow-sc-card">
              <p className="text-base font-black">OTP</p>
              <p className="text-[10px] font-bold text-white/95">מאובטח</p>
            </div>
          </div>
        </header>

        <main className="relative z-10 -mt-3 space-y-4 px-4 pt-2">{children}</main>

        {hasDock && (
          <nav className="bottom-dock fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-md justify-around gap-1 rounded-t-sc-lg border-t border-sc-border px-2 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-2 backdrop-blur-xl">
            {bottomNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex min-w-[4.5rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-sc-md px-2 py-2.5 text-[10px] font-black transition ${
                      isActive
                        ? 'bg-[var(--sc-accent)]/14 text-[var(--sc-accent)] shadow-sm'
                        : 'text-sc-muted hover:bg-black/[0.03] hover:text-sc-text'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        size={22}
                        strokeWidth={isActive ? 2.25 : 1.75}
                        className={isActive ? 'text-[var(--sc-accent)]' : 'text-current'}
                      />
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
