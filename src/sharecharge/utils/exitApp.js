import { Capacitor } from '@capacitor/core';
import { clearAuthSession } from '../auth/session';
import { getAppEntryPath } from '../config/appConfig';

export async function exitShareChargeApp(portal = 'client') {
  clearAuthSession(portal);

  if (Capacitor.isNativePlatform()) {
    const { App } = await import('@capacitor/app');
    await App.exitApp();
    return;
  }

  const entry = getAppEntryPath();
  window.location.hash = entry.startsWith('/') ? entry : `/${entry}`;
  window.location.reload();
}
