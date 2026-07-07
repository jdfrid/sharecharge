import { useCallback, useEffect, useRef, useState } from 'react';
import { forwardGeocode } from '../utils/forwardGeocode';

export function useAddressSearch({ gpsOrigin, gpsLabel, enabled = true } = {}) {
  const [query, setQuery] = useState('');
  const [manualOrigin, setManualOrigin] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const debounceRef = useRef(null);

  const origin = manualOrigin || gpsOrigin || null;
  const originLabel = manualOrigin?.label || gpsLabel || 'מיקום לא זמין';
  const usingGps = !manualOrigin && !!gpsOrigin;

  const pickSuggestion = useCallback((item) => {
    setManualOrigin({ lat: item.lat, lng: item.lng, label: item.address || item.displayName });
    setQuery(item.address || item.displayName || '');
    setSuggestions([]);
    setSearchError('');
  }, []);

  const resetToGps = useCallback(() => {
    setManualOrigin(null);
    setQuery('');
    setSuggestions([]);
    setSearchError('');
  }, []);

  const runSearch = useCallback(async (text) => {
    const q = String(text || '').trim();
    if (q.length < 2) {
      setSearchError('הקלידו לפחות 2 תווים');
      return;
    }
    setSearching(true);
    setSearchError('');
    try {
      const results = await forwardGeocode(q, { limit: 5 });
      if (!results.length) {
        setSearchError('לא נמצאה כתובת — נסו עיר, רחוב או שכונה');
        setSuggestions([]);
        return;
      }
      setSuggestions(results);
      pickSuggestion(results[0]);
    } catch {
      setSearchError('חיפוש כתובת נכשל — נסו שוב');
    } finally {
      setSearching(false);
    }
  }, [pickSuggestion]);

  useEffect(() => {
    if (!enabled) return undefined;
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return undefined;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await forwardGeocode(q, { limit: 4 });
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      }
    }, 450);
    return () => clearTimeout(debounceRef.current);
  }, [query, enabled]);

  return {
    query,
    setQuery,
    origin,
    originLabel,
    usingGps,
    suggestions,
    searching,
    searchError,
    pickSuggestion,
    resetToGps,
    runSearch,
  };
}
