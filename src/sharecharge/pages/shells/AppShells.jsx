import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Search, CalendarClock, LayoutGrid, ClipboardList, Wallet } from 'lucide-react';
import { MobileAppShell } from '../../components/shell/MobileAppShell';
import { clearAuthSession } from '../../auth/session';
import { useShareCharge } from '../../context/ShareChargeContext';

export function ClientShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const isActivity = location.pathname.includes('/activity');
  const isStation = location.pathname.includes('/station/');
  const { syncSessionProfiles } = useShareCharge();

  useEffect(() => {
    syncSessionProfiles();
  }, [syncSessionProfiles]);

  const onExit = () => {
    clearAuthSession('client');
    navigate('/client/entry');
  };

  const title = isStation ? 'הזמנת עמדה' : isActivity ? 'ההזמנות שלי' : 'עמדות לידך';
  const subtitle = isStation
    ? 'אשר זמן ושלח בקשה לספק'
    : isActivity
      ? 'מעקב מול הספק ו-OTP'
      : 'רשימה או מפה — בחרו עמדה והמשיכו';

  return (
    <MobileAppShell
      portal="client"
      title={title}
      subtitle={subtitle}
      onExit={onExit}
      bottomNav={[
        { to: '/client/discover', label: 'חיפוש', icon: Search, end: true },
        { to: '/client/activity', label: 'הזמנות', icon: CalendarClock },
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

  const meta = path.includes('/transactions')
    ? { title: 'עסקאות', subtitle: 'הכנסות ופירוט עסקאות' }
    : path.includes('/orders')
      ? { title: 'בקשות', subtitle: 'אישור / דחייה ו-OTP' }
      : { title: 'לוח ספק', subtitle: 'עמדות, מחירים ותנאים' };

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
      bottomNav={[
        { to: '/provider/dashboard', label: 'ראשי', icon: LayoutGrid, end: true },
        { to: '/provider/orders', label: 'הזמנות', icon: ClipboardList },
        { to: '/provider/transactions', label: 'עסקאות', icon: Wallet },
      ]}
    >
      <Outlet />
    </MobileAppShell>
  );
}

export function OpsShell() {
  const navigate = useNavigate();
  const onExit = () => {
    clearAuthSession('system');
    navigate('/ops/entry');
  };
  return (
    <MobileAppShell
      portal="system"
      title="מנהל מערכת"
      subtitle="ספקים, לקוחות, עמדות ודוחות"
      onExit={onExit}
      bottomNav={[]}
    >
      <Outlet />
    </MobileAppShell>
  );
}
