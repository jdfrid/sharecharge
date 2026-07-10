import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import DealsManager from './pages/admin/DealsManager';
import CategoriesManager from './pages/admin/CategoriesManager';
import UsersManager from './pages/admin/UsersManager';
import RulesManager from './pages/admin/RulesManager';
import LogsViewer from './pages/admin/LogsViewer';
import ProvidersManager from './pages/admin/ProvidersManager';
import AnalyticsPage from './pages/admin/AnalyticsPage';
import SettingsPage from './pages/admin/SettingsPage';
import MessagesPage from './pages/admin/MessagesPage';
import EarningsPage from './pages/admin/EarningsPage';
import BannersGallery from './pages/admin/BannersGallery';
import SocialHub from './pages/admin/SocialHub';
import TelegramChannels from './pages/admin/TelegramChannels';
import TikTokStudio from './pages/admin/TikTokStudio';
import ShareChargeLegacyRedirect from './pages/ShareChargeLegacyRedirect';
import { ShareChargeLayout } from './sharecharge/routes/ShareChargeLayout';
import { ClientGate, OpsGate, ProviderGate } from './sharecharge/routes/gates';
import { SHARECHARGE_ROLE_KEYS } from './sharecharge/constants';
import { getAppEntryPath, getShareChargeApp, isSingleAppBuild } from './sharecharge/config/appConfig';
import { ShareChargeHub } from './sharecharge/pages/ShareChargeHub';
import { ShareChargeRoleEntry } from './sharecharge/pages/ShareChargeRoleEntry';
import { ClientShell, OpsShell, ProviderShell } from './sharecharge/pages/shells/AppShells';
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
import { OpsDesktopLayout } from './sharecharge/pages/ops/desktop/OpsDesktopLayout';
import { OpsDesktopOverviewPage } from './sharecharge/pages/ops/desktop/OpsDesktopOverviewPage';
import {
  OpsDesktopBookingsPage,
  OpsDesktopStationsPage,
  OpsDesktopTendersPage,
  OpsDesktopUsersPage,
} from './sharecharge/pages/ops/desktop/OpsDesktopDataPages';
import { OpsDesktopToolsPage } from './sharecharge/pages/ops/desktop/OpsDesktopToolsPage';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}

/** Must be invoked as {shareChargeRouteElements()} — not a <Component /> (React Router rejects that). */
function shareChargeRouteElements() {
  const app = getShareChargeApp();
  const showClient = app === 'all' || app === 'client';
  const showProvider = app === 'all' || app === 'provider';
  const showOps = app === 'all' || app === 'ops';

  return (
    <>
      {!isSingleAppBuild() && <Route path="/sharecharge" element={<ShareChargeHub />} />}

      {showClient && (
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
      )}

      {showProvider && (
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
      )}

      {showOps && (
        <>
          <Route path="/ops/entry" element={<ShareChargeRoleEntry portal={SHARECHARGE_ROLE_KEYS.system} />} />
          <Route element={<OpsGate />}>
            <Route element={<OpsDesktopLayout />}>
              <Route path="/ops/console" element={<OpsDesktopOverviewPage />} />
              <Route path="/ops/console/users" element={<OpsDesktopUsersPage />} />
              <Route path="/ops/console/stations" element={<OpsDesktopStationsPage />} />
              <Route path="/ops/console/bookings" element={<OpsDesktopBookingsPage />} />
              <Route path="/ops/console/tenders" element={<OpsDesktopTendersPage />} />
              <Route path="/ops/console/tools" element={<OpsDesktopToolsPage />} />
            </Route>
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

function App() {
  const rootPath = isSingleAppBuild() ? getAppEntryPath() : '/sharecharge';
  const includeDealsAdmin = !isSingleAppBuild();

  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Navigate to={rootPath} replace />} />

        <Route element={<ShareChargeLayout />}>
          {shareChargeRouteElements()}
        </Route>

        <Route path="/app" element={<Navigate to={rootPath} replace />} />
        <Route path="/app/:role" element={<ShareChargeLegacyRedirect />} />

        {includeDealsAdmin && (
          <>
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="deals" element={<DealsManager />} />
              <Route path="categories" element={<CategoriesManager />} />
              <Route path="users" element={<ProtectedRoute roles={['admin']}><UsersManager /></ProtectedRoute>} />
              <Route path="rules" element={<ProtectedRoute roles={['admin']}><RulesManager /></ProtectedRoute>} />
              <Route path="logs" element={<ProtectedRoute roles={['admin']}><LogsViewer /></ProtectedRoute>} />
              <Route path="providers" element={<ProtectedRoute roles={['admin']}><ProvidersManager /></ProtectedRoute>} />
              <Route path="analytics" element={<ProtectedRoute roles={['admin']}><AnalyticsPage /></ProtectedRoute>} />
              <Route path="settings" element={<ProtectedRoute roles={['admin']}><SettingsPage /></ProtectedRoute>} />
              <Route path="messages" element={<ProtectedRoute roles={['admin']}><MessagesPage /></ProtectedRoute>} />
              <Route path="earnings" element={<ProtectedRoute roles={['admin']}><EarningsPage /></ProtectedRoute>} />
              <Route path="banners" element={<ProtectedRoute roles={['admin']}><BannersGallery /></ProtectedRoute>} />
              <Route path="social" element={<ProtectedRoute roles={['admin']}><SocialHub /></ProtectedRoute>} />
              <Route path="telegram" element={<ProtectedRoute roles={['admin']}><TelegramChannels /></ProtectedRoute>} />
              <Route path="video-studio" element={<ProtectedRoute roles={['admin', 'editor']}><TikTokStudio /></ProtectedRoute>} />
              <Route path="tiktok" element={<ProtectedRoute roles={['admin', 'editor']}><TikTokStudio /></ProtectedRoute>} />
            </Route>
          </>
        )}

        <Route path="*" element={<Navigate to={rootPath} replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
