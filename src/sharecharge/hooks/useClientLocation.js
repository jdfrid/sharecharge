import { useCallback, useEffect, useState } from 'react';

const defaultState = {
  lat: null,
  lng: null,
  accuracy: null,
  error: null,
  loading: true,
};

export function useClientLocation(enabled = true) {
  const [location, setLocation] = useState(defaultState);

  const refresh = useCallback(() => {
    if (!enabled || typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocation((prev) => ({
        ...prev,
        loading: false,
        error: 'GPS לא זמין בדפדפן/מכשיר',
      }));
      return;
    }

    setLocation((prev) => ({ ...prev, loading: true, error: null }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          error: null,
          loading: false,
        });
      },
      (err) => {
        setLocation((prev) => ({
          ...prev,
          loading: false,
          error: err.message || 'לא ניתן לקבל מיקום',
        }));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  }, [enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...location, refresh };
}
