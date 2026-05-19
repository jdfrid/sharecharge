import { useCallback, useMemo, useState } from 'react';
import Map, { Marker } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import { MapPin } from 'lucide-react';
import 'maplibre-gl/dist/maplibre-gl.css';

const DEFAULT_VIEW = {
  longitude: 34.78,
  latitude: 32.09,
  zoom: 10,
};

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

export function StationMap({ stations, selectedId, onSelectStation, className = '' }) {
  const valid = useMemo(
    () => stations.filter((s) => typeof s.lng === 'number' && typeof s.lat === 'number'),
    [stations],
  );

  const [viewState, setViewState] = useState(DEFAULT_VIEW);

  const fitPadding = useCallback(() => {
    if (!valid.length) return;
    const lngs = valid.map((s) => s.lng);
    const lats = valid.map((s) => s.lat);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const cx = (minLng + maxLng) / 2;
    const cy = (minLat + maxLat) / 2;
    setViewState((v) => ({ ...v, longitude: cx, latitude: cy, zoom: valid.length === 1 ? 12 : 10 }));
  }, [valid]);

  return (
    <div dir="ltr" className={`overflow-hidden rounded-sc-lg ring-1 ring-slate-200/80 ${className}`}>
      <div className="flex items-center justify-between border-b border-sc-border bg-white px-3 py-2">
        <p className="text-xs font-black text-sc-text">מפה · {valid.length} עמדות</p>
        <button
          type="button"
          onClick={fitPadding}
          className="rounded-full border border-sc-border bg-sc-surface px-3 py-1 text-[10px] font-black text-sc-text"
        >
          מרכוז
        </button>
      </div>
      <div className="relative h-[260px] w-full bg-sc-surface">
        <Map
          {...viewState}
          onMove={(evt) => setViewState(evt.viewState)}
          mapLib={maplibregl}
          mapStyle={MAP_STYLE}
          style={{ width: '100%', height: '100%' }}
        >
          {valid.map((station) => {
            const selected = station.id === selectedId;
            return (
              <Marker
                key={station.id}
                longitude={station.lng}
                latitude={station.lat}
                anchor="bottom"
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  onSelectStation?.(station);
                }}
              >
                <button
                  type="button"
                  className={`flex flex-col items-center gap-0.5 rounded-full shadow-lg ring-2 transition ${
                    selected ? 'bg-[var(--sc-accent)] ring-white' : 'bg-white ring-[var(--sc-accent)]/40'
                  }`}
                  aria-label={station.name}
                >
                  <span className={`rounded-full px-2 py-1 ${selected ? 'text-white' : 'text-sc-text'}`}>
                    <MapPin size={20} className={selected ? 'text-white' : 'text-[var(--sc-accent)]'} />
                  </span>
                </button>
              </Marker>
            );
          })}
        </Map>
      </div>
    </div>
  );
}
