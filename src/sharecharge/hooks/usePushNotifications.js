import { useEffect } from 'react';
import { getShareChargeApp } from '../config/appConfig';

/** Lightweight local alerts when new tender bids arrive (web/APK without FCM). */
export function usePushNotifications(enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;
    const app = getShareChargeApp();
    if (app !== 'client' && app !== 'provider') return undefined;
    if (typeof Notification === 'undefined') return undefined;
    if (Notification.permission !== 'denied' && Notification.permission !== 'granted') {
      Notification.requestPermission().catch(() => {});
    }
    return undefined;
  }, [enabled]);
}

export function notifyNewTenderBid({ providerName, total, etaMinutes }) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const body = `${providerName || 'ספק'} · ${etaMinutes || '?'} דק · ₪${total || '—'}`;
  try {
    new Notification('הצעה חדשה — ShareCharge', { body, tag: 'sharecharge-bid' });
  } catch {
    /* ignore */
  }
}

export function notifyEmergencyTender({ categoryLabel, addressText, distanceKm }) {
  const dist = distanceKm != null ? `${distanceKm} ק״מ` : 'באזור';
  const body = `${categoryLabel || 'חירום'} · ${dist} · ${addressText || 'מיקום GPS'}`;
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      new Notification('קריאת חירום — ShareCharge', { body, tag: 'sharecharge-emergency' });
    } catch {
      /* ignore */
    }
  }
}

export function notifyBookingUpdate({ title, body }) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    new Notification(title || 'ShareCharge', { body: body || '', tag: 'sharecharge-booking' });
  } catch {
    /* ignore */
  }
}
