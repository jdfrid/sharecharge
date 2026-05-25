import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { initNativeShareChargeFlavor } from './sharecharge/config/nativeFlavor';
import './styles/index.css';

async function boot() {
  await initNativeShareChargeFlavor();

  const isNativeApp =
    Capacitor.isNativePlatform() ||
    (import.meta.env.VITE_SHARECHARGE_APP && import.meta.env.VITE_SHARECHARGE_APP !== 'all');

  try {
    if (!isNativeApp) {
      const { initAnalytics } = await import('./utils/analytics');
      try {
        initAnalytics();
      } catch (e) {
        console.warn('Analytics init skipped', e);
      }
    }
  } catch (e) {
    console.warn('Boot init skipped', e);
  }

  const AppModule = isNativeApp ? await import('./AppShareChargeNative.jsx') : await import('./App.jsx');
  const App = AppModule.default;

  const tree = (
    <AppErrorBoundary>
      <HashRouter>
        <App />
      </HashRouter>
    </AppErrorBoundary>
  );

  ReactDOM.createRoot(document.getElementById('root')).render(
    isNativeApp ? tree : <React.StrictMode>{tree}</React.StrictMode>,
  );
}

boot().catch((err) => {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<div dir="rtl" style="padding:24px;font-family:system-ui"><h1 style="color:#c62828">שגיאת הפעלה</h1><p>${String(err?.message || err)}</p></div>`;
  }
  console.error(err);
});
