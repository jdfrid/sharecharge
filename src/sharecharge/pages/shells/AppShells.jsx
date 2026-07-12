import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, CalendarClock, LayoutGrid, ClipboardList, Wallet, Radio, Zap, CreditCard } from 'lucide-react';
import { MobileAppShell } from '../../components/shell/MobileAppShell';
import { ProviderEmergencyAlerts } from '../../components/ProviderEmergencyAlerts';
import { ProviderCounterAlerts } from '../../components/ProviderCounterAlerts';
import { ProviderBidSheet } from '../../components/provider/ProviderBidSheet';
import { ProviderBidProvider, useProviderBid } from '../../context/ProviderBidContext';
import { clearAuthSession, isPortalSessionReady } from '../../auth/session';
import { exitShareChargeApp } from '../../utils/exitApp';
import { useShareCharge } from '../../context/ShareChargeContext';
import { useSyncedProviderHost } from '../../hooks/useSyncedProviderHost';
import { useProviderEmergencyAlerts } from '../../hooks/useProviderEmergencyAlerts';
import { useProviderCounterBids } from '../../hooks/useProviderCounterBids';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { formatShareChargeApiError } from '../../data/sharechargeApi';
import { getAppEntryPath, getShareChargeApp, isSingleAppBuild } from '../../config/appConfig';

const homeLink = () => (isSingleAppBuild() ? getAppEntryPath() : '/sharecharge');

function clientMeta(path) {
  if (path.includes('/become-provider')) return { title: 'הפוך לספק', subtitle: 'הרשמה עצמית כספק SOS או עמדת טעינה' };
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
  return (
    <ProviderBidProvider>
      <ProviderShellInner />
    </ProviderBidProvider>
  );
}

function ProviderShellInner() {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;
  const { state, refreshFromApi, repositoryMode, submitTenderBid } = useShareCharge();
  const { activeHostId: hostId } = useSyncedProviderHost(state);
  const { alerts, dismiss, relevantRequests } = useProviderEmergencyAlerts({ state, hostId, enabled: !!hostId });
  const { alerts: counterAlerts } = useProviderCounterBids({ enabled: !!hostId });
  const [dismissedCounters, setDismissedCounters] = useState(() => new Set());
  const { bidRequestId, bidError, setBidError, openBid, closeBid } = useProviderBid();
  const bidRequest = (state.serviceRequests || []).find((item) => item.id === bidRequestId);

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

  const handleOpenBid = (requestId, kind = 'new_call') => {
    if (kind === 'pending_confirm') {
      dismiss(requestId);
      navigate('/provider/tenders');
      return;
    }
    const stillOpen = (state.serviceRequests || []).some(
      (item) => item.id === requestId && item.status === 'open',
    );
    if (!stillOpen) {
      alert('הקריאה כבר נסגרה או אינה זמינה להצעות');
      dismiss(requestId);
      return;
    }
    openBid(requestId);
    dismiss(requestId);
    if (!path.includes('/tenders')) {
      navigate('/provider/tenders');
    }
  };

  const handleOpenCounter = (alert) => {
    setDismissedCounters((prev) => new Set(prev).add(alert.bidId));
    navigate('/provider/tenders', { state: { reviseBidId: alert.bidId } });
  };

  const visibleCounterAlerts = counterAlerts.filter((alert) => !dismissedCounters.has(alert.bidId));
  const showShellCounterAlerts = visibleCounterAlerts.length && !path.includes('/tenders');

  return (
    <>
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
        <ProviderEmergencyAlerts
          alerts={alerts.filter((alert) =>
            alert.kind === 'pending_confirm'
              ? (state.serviceRequests || []).some(
                  (item) => item.id === alert.requestId && item.status === 'pending_provider',
                )
              : relevantRequests.some((item) => item.id === alert.requestId),
          )}
          onDismiss={dismiss}
          onOpenBid={handleOpenBid}
        />
        <ProviderCounterAlerts
          alerts={showShellCounterAlerts ? visibleCounterAlerts : []}
          onDismiss={(bidId) => setDismissedCounters((prev) => new Set(prev).add(bidId))}
          onOpenTenders={handleOpenCounter}
        />
        <Outlet />
      </MobileAppShell>
      {bidRequestId ? (
        <ProviderBidSheet
          requestId={bidRequestId}
          category={bidRequest?.category}
          onClose={closeBid}
          error={bidError}
          onSubmit={async (payload) => {
            try {
              setBidError('');
              await submitTenderBid(bidRequestId, payload);
              closeBid();
            } catch (err) {
              const message = formatShareChargeApiError(err, 'bid') || err?.message || 'שליחת הצעה נכשלה';
              setBidError(message);
              alert(message);
            }
          }}
        />
      ) : null}
    </>
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
