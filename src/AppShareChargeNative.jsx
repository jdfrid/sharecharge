import { Routes, Route, Navigate } from 'react-router-dom';
import { ShareChargeLayout } from './sharecharge/routes/ShareChargeLayout';
import { ClientGate, OpsGate, ProviderGate } from './sharecharge/routes/gates';
import { SHARECHARGE_ROLE_KEYS } from './sharecharge/constants';
import { getAppEntryPath, getShareChargeApp } from './sharecharge/config/appConfig';
import { ShareChargeRoleEntry } from './sharecharge/pages/ShareChargeRoleEntry';
import { ClientShell, OpsShell, ProviderShell } from './sharecharge/pages/shells/AppShells';
import { DualShell } from './sharecharge/pages/shells/DualShell';
import { ClientHomePage } from './sharecharge/pages/client/ClientHomePage';
import { ClientInlineAuth } from './sharecharge/pages/client/ClientInlineAuth';
import { ClientChargingMapPage } from './sharecharge/pages/client/ClientChargingMapPage';
import { ClientNavigatePage } from './sharecharge/pages/client/ClientNavigatePage';
import { ClientReceiptPage } from './sharecharge/pages/client/ClientReceiptPage';
import { ClientPaymentPage } from './sharecharge/pages/client/ClientPaymentPage';
import { ClientPaymentReturnPage } from './sharecharge/pages/client/ClientPaymentReturnPage';
import { ClientPaymentsHubPage } from './sharecharge/pages/client/ClientPaymentsHubPage';
import { ClientEmergencyPage } from './sharecharge/pages/client/ClientEmergencyPage';
import { ClientTenderOffersPage } from './sharecharge/pages/client/ClientTenderOffersPage';
import { ClientTrackPage } from './sharecharge/pages/client/ClientTrackPage';
import { ClientStationRedirect } from './sharecharge/routes/ClientStationRedirect';
import { ClientStationPage } from './sharecharge/pages/client/ClientStationPage';
import { ClientServiceBrowsePage, ClientServiceBookPage } from './sharecharge/pages/client/ClientServicesPages';
import { ClientActivityPage } from './sharecharge/pages/client/ClientActivityPage';
import { ClientBecomeProviderPage } from './sharecharge/pages/client/ClientBecomeProviderPage';
import { ProviderDashboardPage } from './sharecharge/pages/provider/ProviderDashboardPage';
import { ProviderOrdersPage } from './sharecharge/pages/provider/ProviderOrdersPage';
import { ProviderTransactionsPage } from './sharecharge/pages/provider/ProviderTransactionsPage';
import { ProviderPaymentsPage } from './sharecharge/pages/provider/ProviderPaymentsPage';
import { ProviderTendersPage } from './sharecharge/pages/provider/ProviderTendersPage';
import { OpsDashboardPage } from './sharecharge/pages/ops/OpsDashboardPage';
import { OpsPaymentsPage } from './sharecharge/pages/ops/OpsPaymentsPage';

function clientRouteTree() {
  return (
    <>
      <Route path="/client/entry" element={<ShareChargeRoleEntry portal={SHARECHARGE_ROLE_KEYS.client} />} />
      <Route element={<ClientShell />}>
        <Route path="/client" element={<Navigate to="/client/home" replace />} />
        <Route path="/client/home" element={<ClientHomePage />} />
        <Route path="/client/auth" element={<ClientInlineAuth />} />
        <Route path="/client/discover" element={<Navigate to="/client/charging/map" replace />} />
        <Route path="/client/charging/map" element={<ClientChargingMapPage />} />
        <Route path="/client/charging/:stationId" element={<ClientStationPage />} />
        <Route path="/client/station/:stationId" element={<ClientStationRedirect />} />
        <Route path="/client/emergency" element={<ClientEmergencyPage />} />
        <Route path="/client/services/:category" element={<ClientServiceBrowsePage />} />
        <Route path="/client/services/:category/:stationId" element={<ClientServiceBookPage />} />
        <Route element={<ClientGate />}>
          <Route path="/client/activity" element={<ClientActivityPage />} />
          <Route path="/client/become-provider" element={<ClientBecomeProviderPage />} />
          <Route path="/client/navigate/:bookingId" element={<ClientNavigatePage />} />
          <Route path="/client/tender/:id/offers" element={<ClientTenderOffersPage />} />
          <Route path="/client/track/:id" element={<ClientTrackPage />} />
          <Route path="/client/receipt/:id" element={<ClientReceiptPage />} />
          <Route path="/client/payment/return" element={<ClientPaymentReturnPage />} />
          <Route path="/client/payment/:refType/:refId" element={<ClientPaymentPage />} />
          <Route path="/client/payments" element={<ClientPaymentsHubPage />} />
        </Route>
      </Route>
    </>
  );
}

function providerRouteTree() {
  return (
    <>
      <Route path="/provider/entry" element={<ShareChargeRoleEntry portal={SHARECHARGE_ROLE_KEYS.provider} />} />
      <Route element={<ProviderGate />}>
        <Route element={<ProviderShell />}>
          <Route path="/provider" element={<Navigate to="/provider/dashboard" replace />} />
          <Route path="/provider/dashboard" element={<ProviderDashboardPage />} />
          <Route path="/provider/orders" element={<ProviderOrdersPage />} />
          <Route path="/provider/tenders" element={<ProviderTendersPage />} />
          <Route path="/provider/transactions" element={<ProviderTransactionsPage />} />
          <Route path="/provider/payments" element={<ProviderPaymentsPage />} />
        </Route>
      </Route>
    </>
  );
}

function nativeRouteElements() {
  const app = getShareChargeApp();

  return (
    <>
      {app === 'client' && clientRouteTree()}

      {app === 'provider' && providerRouteTree()}

      {app === 'dual' && (
        <Route element={<DualShell />}>
          {clientRouteTree()}
          {providerRouteTree()}
        </Route>
      )}

      {app === 'ops' && (
        <>
          <Route path="/ops/entry" element={<ShareChargeRoleEntry portal={SHARECHARGE_ROLE_KEYS.system} />} />
          <Route element={<OpsGate />}>
            <Route element={<OpsShell />}>
              <Route path="/ops" element={<Navigate to="/ops/dashboard" replace />} />
              <Route path="/ops/dashboard" element={<OpsDashboardPage />} />
              <Route path="/ops/payments" element={<OpsPaymentsPage />} />
            </Route>
          </Route>
        </>
      )}
    </>
  );
}

export default function AppShareChargeNative() {
  const entry = getAppEntryPath();

  return (
    <Routes>
      <Route path="/" element={<Navigate to={entry} replace />} />
      <Route element={<ShareChargeLayout />}>{nativeRouteElements()}</Route>
      <Route path="*" element={<Navigate to={entry} replace />} />
    </Routes>
  );
}
