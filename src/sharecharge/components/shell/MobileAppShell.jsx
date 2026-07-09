import { Link, NavLink } from 'react-router-dom';
import { Bell, User, X, Zap } from 'lucide-react';
const heroSurface = {
  client: 'app-hero--client',
  provider: 'app-hero--provider',
  system: 'app-hero--dark bg-gradient-to-br from-midnight-900 via-midnight-800 to-midnight-950 text-white',
};

function greetingForHour(hour) {
  if (hour < 12) return 'בוקר טוב';
  if (hour < 17) return 'צהריים טובים';
  if (hour < 21) return 'ערב טוב';
  return 'לילה טוב';
}

export function MobileAppShell({
  portal,
  title,
  subtitle,
  children,
  onExit,
  exitLabel = 'יציאה מהאפליקציה',
  bottomNav = [],
  actions,
  homeTo = '/sharecharge',
}) {
  const hero = heroSurface[portal] || heroSurface.client;
  const isDarkHero = portal === 'system';
  const isBrandHero = portal === 'client' || portal === 'provider';
  const hasDock = bottomNav.length > 0;
  const greeting = greetingForHour(new Date().getHours());

  return (
    <div
      dir="rtl"
      className={`app-stage sc-skin relative min-h-screen text-sc-text ${
        hasDock ? 'pb-[calc(8.25rem+env(safe-area-inset-bottom,0px))]' : 'pb-[calc(1rem+env(safe-area-inset-bottom,0px))]'
      }`}
    >
      <div className="app-device relative mx-auto min-h-screen max-w-md overflow-x-hidden">
        <header
          data-hero={isBrandHero ? 'brand' : undefined}
          className={`app-hero pointer-events-none relative z-[1] overflow-hidden px-5 pb-6 pt-[calc(0.85rem+env(safe-area-inset-top,0px))] ${hero} ${
            isBrandHero ? 'text-white' : ''
          }`}
        >
          {isDarkHero && (
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(79,134,247,0.25),transparent_50%)]" />
          )}

          {onExit ? (
            <button
              type="button"
              onClick={onExit}
              className={`sc-app-exit pointer-events-auto absolute z-20 flex h-10 w-10 items-center justify-center rounded-full ${
                isBrandHero || isDarkHero
                  ? 'bg-white/15 text-white ring-1 ring-white/25 backdrop-blur'
                  : 'border border-sc-border bg-white/90 text-sc-text shadow-sm'
              }`}
              style={{
                left: '1rem',
                top: 'calc(0.85rem + env(safe-area-inset-top, 0px))',
              }}
              aria-label={exitLabel}
              title={exitLabel}
            >
              <X size={20} strokeWidth={2.25} />
            </button>
          ) : null}

          <div
            className={`pointer-events-auto relative z-10 flex items-start justify-between gap-3 ${
              onExit ? 'pl-12' : ''
            }`}
          >
            <div className="flex shrink-0 items-center gap-2">
              <Link
                to={homeTo}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                  isBrandHero
                    ? 'bg-white/15 text-white ring-1 ring-white/20'
                    : 'bg-gradient-to-br from-[#2563eb] via-[#0ea5e9] to-[#14b8a6] text-white shadow-sc-card'
                }`}
                aria-label="מסך בחירת אפליקציה"
              >
                <Zap size={22} />
              </Link>
              {actions}
              {isBrandHero && (
                <>
                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-2xl sc-hero-chip"
                    aria-label="התראות"
                  >
                    <Bell size={18} />
                  </button>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 ring-2 ring-white/30">
                    <User size={18} className="text-white" />
                  </div>
                </>
              )}
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              {isBrandHero ? (
                <>
                  <p className="text-sm font-bold sc-hero-muted">{greeting}</p>
                  <h1 className="mt-0.5 truncate text-2xl font-black tracking-tight text-white">{title}</h1>
                  <p className="mt-1 truncate text-sm font-bold sc-hero-muted">{subtitle}</p>
                </>
              ) : isDarkHero ? (
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
          </div>
        </header>

        <main className="relative z-10 isolate space-y-4 px-4 pb-2 pt-1 pointer-events-auto">{children}</main>

        {hasDock && (
          <nav className="bottom-dock fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-md items-end justify-around gap-1 rounded-t-[1.75rem] px-3 pb-[calc(0.65rem+env(safe-area-inset-bottom,0px))] pt-3">
            {bottomNav.map((item) => {
              const Icon = item.icon;
              if (item.center) {
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `sc-nav-link ${isActive ? 'sc-nav-link--active' : 'text-sc-muted'}`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span className={`sc-nav-fab ${isActive ? 'sc-nav-fab--active' : ''}`}>
                          <Icon size={22} strokeWidth={2.25} />
                        </span>
                        <span>{item.label}</span>
                      </>
                    )}
                  </NavLink>
                );
              }

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `sc-nav-link ${isActive ? 'sc-nav-link--active' : 'text-sc-muted hover:text-sc-text'}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={22} strokeWidth={isActive ? 2.25 : 1.75} />
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
