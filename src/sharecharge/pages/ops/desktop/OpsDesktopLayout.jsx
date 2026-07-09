import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  RefreshCw,
  Settings2,
  Users,
  Zap,
} from 'lucide-react';
import { clearAuthSession } from '../../../auth/session';
import { SHARECHARGE_ROLE_KEYS } from '../../../constants';
import { useShareCharge } from '../../../context/ShareChargeContext';

const navItems = [
  { path: '/ops/console', label: 'סקירה', icon: LayoutDashboard, end: true },
  { path: '/ops/console/users', label: 'משתמשים', icon: Users },
  { path: '/ops/console/stations', label: 'עמדות', icon: Zap },
  { path: '/ops/console/bookings', label: 'הזמנות', icon: CalendarClock },
  { path: '/ops/console/tenders', label: 'קריאות SOS', icon: AlertTriangle },
  { path: '/ops/console/tools', label: 'כלים', icon: Settings2 },
];

export function OpsDesktopLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();
  const { refreshFromApi } = useShareCharge();

  const logout = () => {
    clearAuthSession(SHARECHARGE_ROLE_KEYS.system);
    navigate('/ops/entry');
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      await refreshFromApi(SHARECHARGE_ROLE_KEYS.system);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--sc-bg)] text-[var(--sc-text)]" dir="rtl">
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="סגור תפריט"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-64 flex-col border-l border-[var(--sc-border)] bg-white shadow-xl transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="border-b border-[var(--sc-border)] px-5 py-5">
          <p className="text-xs font-black uppercase tracking-wide text-[var(--sc-muted)]">ShareCharge</p>
          <h1 className="mt-1 text-lg font-black text-[var(--sc-accent)]">קונסול ניהול</h1>
          <p className="mt-1 text-[11px] font-bold text-sc-muted">ממשק מחשב · מחיקה וניהול נתונים</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-black transition ${
                  isActive
                    ? 'bg-[var(--sc-accent)]/10 text-[var(--sc-accent)]'
                    : 'text-sc-muted hover:bg-sc-surface hover:text-sc-text'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-[var(--sc-border)] p-3">
          <NavLink
            to="/ops/dashboard"
            className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold text-sc-muted hover:bg-sc-surface"
          >
            <Activity size={16} />
            אפליקציית מובייל
          </NavLink>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-black text-[var(--sc-danger)] hover:bg-red-50"
          >
            <LogOut size={18} />
            יציאה
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col lg:mr-64">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[var(--sc-border)] bg-white/90 px-4 backdrop-blur">
          <button
            type="button"
            className="rounded-lg p-2 hover:bg-sc-surface lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={22} />
          </button>
          <p className="flex-1 text-sm font-bold text-sc-muted">ניהול מערכת ShareCharge</p>
          <button
            type="button"
            disabled={refreshing}
            onClick={refresh}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--sc-border)] px-3 py-1.5 text-xs font-black text-sc-text hover:bg-sc-surface disabled:opacity-60"
          >
            {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            רענון נתונים
          </button>
        </header>
        <main className="flex-1 p-4 lg:p-8">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
