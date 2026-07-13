import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { User, Store } from 'lucide-react';
import { isPortalSessionReady } from '../../auth/session';

function isEntryOrAuth(path) {
  return path.includes('/entry') || path.includes('/auth');
}

export function DualShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const hideTabs = isEntryOrAuth(path);
  const activeTab = path.startsWith('/provider') ? 'provider' : 'client';

  const switchTab = (tab) => {
    if (tab === activeTab) return;
    if (tab === 'client') {
      navigate(isPortalSessionReady('client') ? '/client/home' : '/client/entry', { replace: true });
      return;
    }
    navigate(isPortalSessionReady('provider') ? '/provider/dashboard' : '/provider/entry', { replace: true });
  };

  return (
    <>
      {!hideTabs ? (
        <div
          dir="rtl"
          className="fixed inset-x-0 top-0 z-[55] mx-auto flex max-w-md justify-center px-4 pt-[calc(0.35rem+env(safe-area-inset-top,0px))]"
        >
          <div className="flex w-full gap-1 rounded-full border border-sc-border bg-white/95 p-1 shadow-sc-card backdrop-blur">
            <button
              type="button"
              onClick={() => switchTab('client')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-black transition ${
                activeTab === 'client'
                  ? 'bg-[var(--sc-accent)] text-white shadow-sm'
                  : 'text-sc-muted'
              }`}
            >
              <User size={16} />
              לקוח
            </button>
            <button
              type="button"
              onClick={() => switchTab('provider')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-black transition ${
                activeTab === 'provider'
                  ? 'bg-[var(--sc-accent-2)] text-white shadow-sm'
                  : 'text-sc-muted'
              }`}
            >
              <Store size={16} />
              ספק
            </button>
          </div>
        </div>
      ) : null}
      <div className={hideTabs ? '' : 'pt-[calc(3.25rem+env(safe-area-inset-top,0px))]'}>
        <Outlet />
      </div>
    </>
  );
}
