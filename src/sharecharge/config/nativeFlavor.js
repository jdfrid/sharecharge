import { Capacitor } from '@capacitor/core';
import { initShareChargeApp } from './appConfig';

const FLAVOR_BY_APP_ID = {
  'com.sharecharge.client': 'client',
  'com.sharecharge.provider': 'provider',
  'com.sharecharge.ops': 'ops',
  'com.sharecharge.dual': 'dual',
};

/** Reads Android/iOS bundle id so each APK gets the correct role even with shared web assets. */
export async function initNativeShareChargeFlavor() {
  if (!Capacitor.isNativePlatform()) return null;

  try {
    const { App } = await import('@capacitor/app');
    const info = await App.getInfo();
    const flavor = FLAVOR_BY_APP_ID[info.id];
    if (flavor) {
      initShareChargeApp(flavor);
      return flavor;
    }
    console.warn('Unknown native app id:', info.id);
  } catch (err) {
    console.warn('Native flavor init failed', err);
  }

  const fromEnv = import.meta.env.VITE_SHARECHARGE_APP;
  if (fromEnv && fromEnv !== 'all') {
    initShareChargeApp(fromEnv);
    return fromEnv;
  }
  return null;
}

export function isCapacitorNativeApp() {
  return Capacitor.isNativePlatform();
}
