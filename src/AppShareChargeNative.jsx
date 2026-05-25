import { Routes, Route, Navigate } from 'react-router-dom';
import { ShareChargeLayout } from './sharecharge/routes/ShareChargeLayout';
import { ClientGate, OpsGate, ProviderGate } from './sharecharge/routes/gates';
import { SHARECHARGE_ROLE_KEYS } from './sharecharge/constants';
import { getAppEntryPath, getShareChargeApp } from './sharecharge/config/appConfig';
import { ShareChargeRoleEntry } from './sharecharge/pages/ShareChargeRoleEntry';
import { ClientShell, OpsShell, ProviderShell } from './sharecharge/pages/shells/AppShells';
import { ClientDiscoverPage } from './sharecharge/pages/client/ClientDiscoverPage';
import { ClientStationPage } from './sharecharge/pages/client/ClientStationPage';
import { ClientActivityPage } from './sharecharge/pages/client/ClientActivityPage';
import { ProviderDashboardPage } from './sharecharge/pages/provider/ProviderDashboardPage';
import { ProviderOrdersPage } from './sharecharge/pages/provider/ProviderOrdersPage';
import { ProviderTransactionsPage } from './sharecharge/pages/provider/ProviderTransactionsPage';
import { OpsDashboardPage } from './sharecharge/pages/ops/OpsDashboardPage';

function nativeRouteElements() {
  const app = getShareChargeApp();

  return (
    <>
      {app === 'client' && (
        <>
          <Route path="/client/entry" element={<ShareChargeRoleEntry portal={SHARECHARGE_ROLE_KEYS.client} />} />
          <Route element={<ClientGate />}>
            <Route element={<ClientShell />}>
              <Route path="/client" element={<Navigate to="/client/discover" replace />} />
              <Route path="/client/discover" element={<ClientDiscoverPage />} />
              <Route path="/client/station/:stationId" element={<ClientStationPage />} />
              <Route path="/client/activity" element={<ClientActivityPage />} />
            </Route>
          </Route>
        </>
      )}

      {app === 'provider' && (
        <>
          <Route path="/provider/entry" element={<ShareChargeRoleEntry portal={SHARECHARGE_ROLE_KEYS.provider} />} />
          <Route element={<ProviderGate />}>
            <Route element={<ProviderShell />}>
              <Route path="/provider" element={<Navigate to="/provider/dashboard" replace />} />
              <Route path="/provider/dashboard" element={<ProviderDashboardPage />} />
              <Route path="/provider/orders" element={<ProviderOrdersPage />} />
              <Route path="/provider/transactions" element={<ProviderTransactionsPage />} />
            </Route>
          </Route>
        </>
      )}

      {app === 'ops' && (
        <>
          <Route path="/ops/entry" element={<ShareChargeRoleEntry portal={SHARECHARGE_ROLE_KEYS.system} />} />
          <Route element={<OpsGate />}>
            <Route element={<OpsShell />}>
              <Route path="/ops" element={<Navigate to="/ops/dashboard" replace />} />
              <Route path="/ops/dashboard" element={<OpsDashboardPage />} />
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
