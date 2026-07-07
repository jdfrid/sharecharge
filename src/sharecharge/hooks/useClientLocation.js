import { useCallback, useEffect, useRef, useState } from 'react';

const defaultState = {
  lat: null,
  lng: null,
  accuracy: null,
  error: null,
  loading: true,
};

export function useClientLocation(enabled = true, { watch = false } = {}) {
  const [location, setLocation] = useState(defaultState);
  const watchIdRef = useRef(null);

  const applyPosition = useCallback((pos) => {
    setLocation({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      error: null,
      loading: false,
    });
  }, []);

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
      applyPosition,
      (err) => {
        setLocation((prev) => ({
          ...prev,
          loading: false,
          error: err.message || 'לא ניתן לקבל מיקום',
        }));
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: watch ? 5000 : 0 },
    );
  }, [enabled, watch, applyPosition]);

  useEffect(() => {
    if (!enabled || !watch || typeof navigator === 'undefined' || !navigator.geolocation) {
      refresh();
      return undefined;
    }

    setLocation((prev) => ({ ...prev, loading: true, error: null }));
    watchIdRef.current = navigator.geolocation.watchPosition(
      applyPosition,
      (err) => {
        setLocation((prev) => ({
          ...prev,
          loading: false,
          error: err.message || 'לא ניתן לקבל מיקום',
        }));
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 },
    );

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [enabled, watch, refresh, applyPosition]);

  return { ...location, refresh };
}
