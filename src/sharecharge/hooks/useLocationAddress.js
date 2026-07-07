import { useEffect, useState } from 'react';
import { reverseGeocode } from '../utils/reverseGeocode';

export function useLocationAddress(lat, lng, enabled = true) {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled || lat == null || lng == null) {
      setAddress('');
      setLoading(false);
      setError(null);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    reverseGeocode(lat, lng)
      .then((text) => {
        if (!cancelled) {
          setAddress(text);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAddress('');
          setError('לא ניתן לזהות כתובת');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [lat, lng, enabled]);

  return { address, loading, error };
}
