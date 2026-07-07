import { useEffect, useMemo, useState } from 'react';
import Map, { Marker } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

export function TrackMap({ points = [], className = '' }) {
  const valid = useMemo(
    () => points.filter((p) => typeof p.lat === 'number' && typeof p.lng === 'number'),
    [points],
  );

  const [viewState, setViewState] = useState(() => {
    if (!valid.length) return { longitude: 34.78, latitude: 32.09, zoom: 11 };
    const cx = valid.reduce((sum, p) => sum + p.lng, 0) / valid.length;
    const cy = valid.reduce((sum, p) => sum + p.lat, 0) / valid.length;
    return { longitude: cx, latitude: cy, zoom: valid.length === 1 ? 13 : 12 };
  });

  useEffect(() => {
    if (!valid.length) return;
    const cx = valid.reduce((sum, p) => sum + p.lng, 0) / valid.length;
    const cy = valid.reduce((sum, p) => sum + p.lat, 0) / valid.length;
    setViewState((v) => ({ ...v, longitude: cx, latitude: cy, zoom: valid.length === 1 ? 13 : 12 }));
  }, [valid]);

  return (
    <div dir="ltr" className={`overflow-hidden rounded-sc-lg ring-1 ring-slate-200/80 ${className}`}>
      <div className="relative h-[240px] w-full bg-sc-surface">
        <Map
          {...viewState}
          onMove={(evt) => setViewState(evt.viewState)}
          mapLib={maplibregl}
          mapStyle={MAP_STYLE}
          style={{ width: '100%', height: '100%' }}
        >
          {valid.map((point) => (
            <Marker key={point.id} longitude={point.lng} latitude={point.lat} anchor="bottom">
              <div className="flex flex-col items-center">
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-black text-white shadow"
                  style={{ backgroundColor: point.color || '#007bff' }}
                >
                  {point.label}
                </span>
                <span
                  className="mt-1 h-3 w-3 rounded-full ring-2 ring-white"
                  style={{ backgroundColor: point.color || '#007bff' }}
                />
              </div>
            </Marker>
          ))}
        </Map>
      </div>
    </div>
  );
}
