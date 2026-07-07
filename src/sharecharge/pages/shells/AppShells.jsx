import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, CalendarClock, LayoutGrid, ClipboardList, Wallet, Radio, Zap, CreditCard } from 'lucide-react';
import { MobileAppShell } from '../../components/shell/MobileAppShell';
import { ProviderEmergencyAlerts } from '../../components/ProviderEmergencyAlerts';
import { clearAuthSession, isPortalSessionReady } from '../../auth/session';
import { exitShareChargeApp } from '../../utils/exitApp';
import { useShareCharge } from '../../context/ShareChargeContext';
import { useSyncedProviderHost } from '../../hooks/useSyncedProviderHost';
import { useProviderEmergencyAlerts } from '../../hooks/useProviderEmergencyAlerts';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { getAppEntryPath, getShareChargeApp, isSingleAppBuild } from '../../config/appConfig';

const homeLink = () => (isSingleAppBuild() ? getAppEntryPath() : '/sharecharge');

function clientMeta(path) {
  if (path.includes('/activity')) return { title: 'ההזמנות שלי', subtitle: 'מעקב · OTP · קבלות' };
  if (path.includes('/charging/map')) return { title: 'עמדות טעינה', subtitle: 'מפה ורשימה לפי GPS' };
  if (path.includes('/charging/')) return { title: 'הזמנת עמדה', subtitle: 'פרטים ואישור' };
  if (path.includes('/emergency')) return { title: 'קריאת חירום', subtitle: 'מיקום וסוג תקלה' };
  if (path.includes('/tender/')) return { title: 'עזרה בדרך', subtitle: 'הצעות מספקים' };
  if (path.includes('/track/')) return { title: 'מעקב עזרה', subtitle: 'ספק בדרך אליך' };
  if (path.includes('/navigate/')) return { title: 'ניווט', subtitle: 'Waze / Maps' };
  if (path.includes('/receipt/')) return { title: 'קבלה', subtitle: 'סיכום תשלום' };
  if (path.includes('/payment/')) return { title: 'תשלום', subtitle: 'Tranzila · חלוקה בין כרטיסים' };
  if (path.includes('/payments')) return { title: 'תשלומים', subtitle: 'ריכוז וחיובים' };
  return { title: 'ShareCharge', subtitle: 'טעינה · חירום · עזרה בדרך' };
}

export function ClientShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;
  const { syncSessionProfiles } = useShareCharge();
  const meta = clientMeta(path);
  const authed = isPortalSessionReady('client');
  const hideShell = path.includes('/auth') || path.includes('/entry');

  useEffect(() => {
    if (authed) syncSessionProfiles();
  }, [syncSessionProfiles, authed]);

  const onExit = () => {
    exitShareChargeApp('client').catch(() => {
      if (authed) clearAuthSession('client');
      navigate('/client/entry');
    });
  };

  if (hideShell) {
    return <Outlet />;
  }

  return (
    <MobileAppShell
      portal="client"
      title={meta.title}
      subtitle={meta.subtitle}
      onExit={onExit}
      homeTo={homeLink()}
      bottomNav={[
        { to: '/client/home', label: 'בית', icon: Home, end: true },
        { to: '/client/charging/map', label: 'טעינה', icon: Zap, center: true },
        { to: '/client/activity', label: 'הזמנות', icon: CalendarClock },
        { to: '/client/payments', label: 'תשלומים', icon: CreditCard },
      ]}
    >
      <Outlet />
    </MobileAppShell>
  );
}

export function ProviderShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;
  const { state, refreshFromApi, repositoryMode } = useShareCharge();
  const { activeHostId: hostId } = useSyncedProviderHost(state);
  const { alerts, dismiss } = useProviderEmergencyAlerts({ state, hostId, enabled: !!hostId });

  usePushNotifications(getShareChargeApp() === 'provider');

  useEffect(() => {
    if (repositoryMode !== 'api') return undefined;
    refreshFromApi();
    const id = setInterval(() => refreshFromApi(), 5000);
    return () => clearInterval(id);
  }, [repositoryMode, refreshFromApi]);

  const meta = path.includes('/transactions')
    ? { title: 'עסקאות', subtitle: 'הכנסות ופירוט' }
    : path.includes('/payments')
      ? { title: 'תשלומים', subtitle: 'ריכוז · העברות לספק' }
    : path.includes('/tenders')
      ? { title: 'מכרזים', subtitle: 'קריאות חירום באזור' }
      : path.includes('/orders')
        ? { title: 'הזמנות', subtitle: 'אישור / OTP' }
        : { title: 'לוח ספק', subtitle: 'עמדות ומחירים' };

  const onExit = () => {
    clearAuthSession('provider');
    navigate('/provider/entry');
  };

  return (
    <MobileAppShell
      portal="provider"
      title={meta.title}
      subtitle={meta.subtitle}
      onExit={onExit}
      homeTo={homeLink()}
      bottomNav={[
        { to: '/provider/dashboard', label: 'ראשי', icon: LayoutGrid, end: true },
        { to: '/provider/orders', label: 'הזמנות', icon: ClipboardList },
        { to: '/provider/tenders', label: 'מכרזים', icon: Radio },
        { to: '/provider/transactions', label: 'עסקאות', icon: Wallet },
        { to: '/provider/payments', label: 'תשלומים', icon: CreditCard },
      ]}
    >
      <ProviderEmergencyAlerts alerts={alerts} onDismiss={dismiss} />
      <Outlet />
    </MobileAppShell>
  );
}

export function OpsShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;
  const meta = path.includes('/payments')
    ? { title: 'ריכוז תשלומים', subtitle: 'Tranzila · חלוקות · עמלות' }
    : { title: 'מנהל מערכת', subtitle: 'ספקים, לקוחות, עמדות ודוחות' };
  const onExit = () => {
    clearAuthSession('system');
    navigate('/ops/entry');
  };
  return (
    <MobileAppShell
      portal="system"
      title={meta.title}
      subtitle={meta.subtitle}
      onExit={onExit}
      homeTo={homeLink()}
      bottomNav={[]}
    >
      <Outlet />
    </MobileAppShell>
  );
}
