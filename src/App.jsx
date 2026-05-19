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
import { ShareChargeHub } from './sharecharge/pages/ShareChargeHub';
import { ShareChargeRoleEntry } from './sharecharge/pages/ShareChargeRoleEntry';
import { ClientShell, OpsShell, ProviderShell } from './sharecharge/pages/shells/AppShells';
import { ClientDiscoverPage } from './sharecharge/pages/client/ClientDiscoverPage';
import { ClientStationPage } from './sharecharge/pages/client/ClientStationPage';
import { ClientActivityPage } from './sharecharge/pages/client/ClientActivityPage';
import { ProviderDashboardPage } from './sharecharge/pages/provider/ProviderDashboardPage';
import { ProviderOrdersPage } from './sharecharge/pages/provider/ProviderOrdersPage';
import { ProviderTransactionsPage } from './sharecharge/pages/provider/ProviderTransactionsPage';
import { OpsDashboardPage } from './sharecharge/pages/ops/OpsDashboardPage';

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

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/sharecharge" replace />} />

        <Route element={<ShareChargeLayout />}>
          <Route path="/sharecharge" element={<ShareChargeHub />} />
          <Route path="/client/entry" element={<ShareChargeRoleEntry portal={SHARECHARGE_ROLE_KEYS.client} />} />
          <Route path="/provider/entry" element={<ShareChargeRoleEntry portal={SHARECHARGE_ROLE_KEYS.provider} />} />
          <Route path="/ops/entry" element={<ShareChargeRoleEntry portal={SHARECHARGE_ROLE_KEYS.system} />} />

          <Route element={<ClientGate />}>
            <Route element={<ClientShell />}>
              <Route path="/client" element={<Navigate to="/client/discover" replace />} />
              <Route path="/client/discover" element={<ClientDiscoverPage />} />
              <Route path="/client/station/:stationId" element={<ClientStationPage />} />
              <Route path="/client/activity" element={<ClientActivityPage />} />
            </Route>
          </Route>

          <Route element={<ProviderGate />}>
            <Route element={<ProviderShell />}>
              <Route path="/provider" element={<Navigate to="/provider/dashboard" replace />} />
              <Route path="/provider/dashboard" element={<ProviderDashboardPage />} />
              <Route path="/provider/orders" element={<ProviderOrdersPage />} />
              <Route path="/provider/transactions" element={<ProviderTransactionsPage />} />
            </Route>
          </Route>

          <Route element={<OpsGate />}>
            <Route element={<OpsShell />}>
              <Route path="/ops" element={<Navigate to="/ops/dashboard" replace />} />
              <Route path="/ops/dashboard" element={<OpsDashboardPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="/app" element={<Navigate to="/sharecharge" replace />} />
        <Route path="/app/:role" element={<ShareChargeLegacyRedirect />} />

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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
