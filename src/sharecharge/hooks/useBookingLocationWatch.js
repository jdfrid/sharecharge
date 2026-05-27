import { useEffect, useRef } from 'react';
import { SHARECHARGE_ROLE_KEYS } from '../constants';
import { sharechargeApi } from '../data/sharechargeApi';

const TRACK_STATUSES = new Set(['approved', 'on_way', 'otp_verified', 'charging']);

/** Periodically report driver GPS for dwell-time / geofence checks. */
export function useBookingLocationWatch(booking, station, enabled) {
  const lastPing = useRef(0);

  useEffect(() => {
    if (!enabled || !booking?.id || !station?.lat || !TRACK_STATUSES.has(booking.status)) return undefined;
    if (typeof navigator === 'undefined' || !navigator.geolocation) return undefined;

    const ping = () => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const now = Date.now();
          if (now - lastPing.current < 25000) return;
          lastPing.current = now;
          try {
            await sharechargeApi.reportBookingLocation(SHARECHARGE_ROLE_KEYS.client, booking.id, {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            });
          } catch {
            /* ignore transient network errors */
          }
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 20000, timeout: 12000 },
      );
    };

    ping();
    const id = setInterval(ping, 30000);
    return () => clearInterval(id);
  }, [enabled, booking?.id, booking?.status, station?.lat, station?.lng]);
}
