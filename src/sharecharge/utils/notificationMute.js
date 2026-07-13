const STORAGE_KEY = 'sharecharge-notifications-muted-until';

export const NOTIFICATION_MUTE_EVENT = 'sharecharge-notification-mute-changed';

export function getNotificationsMutedUntil() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const until = raw ? Number(raw) : 0;
    return Number.isFinite(until) ? until : 0;
  } catch {
    return 0;
  }
}

export function areNotificationsMuted() {
  return Date.now() < getNotificationsMutedUntil();
}

export function muteNotificationsFor(ms) {
  const until = Date.now() + Math.max(0, ms);
  localStorage.setItem(STORAGE_KEY, String(until));
  window.dispatchEvent(new CustomEvent(NOTIFICATION_MUTE_EVENT, { detail: { until } }));
  return until;
}

export function unmuteNotifications() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(NOTIFICATION_MUTE_EVENT, { detail: { until: 0 } }));
}

export function formatMuteRemaining(until = getNotificationsMutedUntil()) {
  const left = until - Date.now();
  if (left <= 0) return '';
  const mins = Math.ceil(left / 60000);
  if (mins < 60) return `${mins} דקות`;
  const hours = Math.ceil(mins / 60);
  if (hours < 24) return `${hours} שעות`;
  return `${Math.ceil(hours / 24)} ימים`;
}

export const MUTE_PRESETS = [
  { id: '30m', label: '30 דקות', ms: 30 * 60 * 1000 },
  { id: '1h', label: 'שעה', ms: 60 * 60 * 1000 },
  { id: '3h', label: '3 שעות', ms: 3 * 60 * 60 * 1000 },
  { id: '8h', label: '8 שעות', ms: 8 * 60 * 60 * 1000 },
  { id: '24h', label: '24 שעות', ms: 24 * 60 * 60 * 1000 },
];
