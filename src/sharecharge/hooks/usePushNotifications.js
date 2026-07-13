import { useEffect } from 'react';
import { getShareChargeApp } from '../config/appConfig';
import { areNotificationsMuted } from '../utils/notificationMute';

/** Lightweight local alerts when new tender bids arrive (web/APK without FCM). */
export function usePushNotifications(enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;
    const app = getShareChargeApp();
    if (app !== 'client' && app !== 'provider' && app !== 'dual') return undefined;
    if (typeof Notification === 'undefined') return undefined;
    if (Notification.permission !== 'denied' && Notification.permission !== 'granted') {
      Notification.requestPermission().catch(() => {});
    }
    return undefined;
  }, [enabled]);
}

function canNotify() {
  return typeof Notification !== 'undefined'
    && Notification.permission === 'granted'
    && !areNotificationsMuted();
}

export function notifyNewTenderBid({ providerName, total, etaMinutes }) {
  if (!canNotify()) return;
  const body = `${providerName || 'ספק'} · ${etaMinutes || '?'} דק · ₪${total || '—'}`;
  try {
    new Notification('הצעה חדשה — ShareCharge', { body, tag: 'sharecharge-bid' });
  } catch {
    /* ignore */
  }
}

export function notifyEmergencyTender({ categoryLabel, addressText, distanceKm, problemDescription, phone }) {
  const dist = distanceKm != null ? `${distanceKm} ק״מ` : 'באזור';
  const details = [categoryLabel || 'חירום', dist, addressText || 'מיקום GPS'];
  if (problemDescription) details.push(problemDescription.slice(0, 60));
  if (phone) details.push(phone);
  const body = details.join(' · ');
  if (canNotify()) {
    try {
      new Notification('קריאת חירום — ShareCharge', { body, tag: 'sharecharge-emergency' });
    } catch {
      /* ignore */
    }
  }
}

export function notifyBookingUpdate({ title, body }) {
  if (!canNotify()) return;
  try {
    new Notification(title || 'ShareCharge', { body: body || '', tag: 'sharecharge-booking' });
  } catch {
    /* ignore */
  }
}
