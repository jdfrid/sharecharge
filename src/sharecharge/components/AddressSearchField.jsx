import { MapPin, Search, X } from 'lucide-react';

export function AddressSearchField({
  query,
  onQueryChange,
  onSearch,
  onPickSuggestion,
  onResetGps,
  suggestions = [],
  searching = false,
  searchError = '',
  usingGps = true,
  originLabel = '',
  placeholder = 'חפשו כתובת: עיר, רחוב, שכונה…',
}) {
  return (
    <div className="space-y-2">
      <form
        className="flex items-center gap-2 rounded-sc-md border border-white/80 bg-white/55 px-3 py-3 shadow-sm backdrop-blur-md"
        onSubmit={(e) => {
          e.preventDefault();
          onSearch?.(query);
        }}
      >
        <Search size={19} className="shrink-0 text-sc-muted" />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder}
          className="w-full border-0 bg-transparent text-sm font-bold text-sc-text outline-none placeholder:text-sc-muted"
        />
        {query ? (
          <button
            type="button"
            onClick={() => onQueryChange('')}
            className="rounded-full p-1 text-sc-muted"
            aria-label="נקה חיפוש"
          >
            <X size={16} />
          </button>
        ) : null}
        <button
          type="submit"
          disabled={searching}
          className="shrink-0 rounded-full bg-[var(--sc-accent)] px-3 py-1.5 text-[11px] font-black text-white disabled:opacity-60"
        >
          {searching ? '…' : 'חפש'}
        </button>
      </form>

      {suggestions.length > 0 ? (
        <div className="overflow-hidden rounded-sc-md border border-sc-border bg-white shadow-sm">
          {suggestions.map((item, index) => (
            <button
              key={`${item.lat}-${item.lng}-${index}`}
              type="button"
              onClick={() => onPickSuggestion(item)}
              className="flex w-full items-start gap-2 border-b border-sc-border/60 px-3 py-2.5 text-right last:border-b-0 active:bg-sc-surface"
            >
              <MapPin size={15} className="mt-0.5 shrink-0 text-[var(--sc-accent)]" />
              <span className="text-xs font-bold leading-snug text-sc-text">
                {item.address || item.displayName}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex items-start gap-2 rounded-sc-sm border border-sc-border/60 bg-sc-surface/80 p-3">
        <MapPin size={18} className="mt-0.5 shrink-0 text-[var(--sc-accent)]" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black text-sc-muted">{usingGps ? 'המיקום שלך (GPS)' : 'נקודת חיפוש'}</p>
          <p className="text-sm font-black leading-snug text-sc-text">{originLabel}</p>
        </div>
        {!usingGps ? (
          <button
            type="button"
            onClick={onResetGps}
            className="shrink-0 rounded-full border border-sc-border bg-white px-2 py-1 text-[10px] font-black text-sc-text"
          >
            חזרה ל-GPS
          </button>
        ) : null}
      </div>

      {searchError ? <p className="text-xs font-bold text-red-600">{searchError}</p> : null}
    </div>
  );
}
