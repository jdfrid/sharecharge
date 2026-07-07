export function PaymentGatewayPanel({ recommendations, region, onRegionChange }) {
  if (!recommendations) return null;

  return (
    <section className="rounded-sc-md border border-sc-border bg-sc-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-black text-sc-text">ספקי סליקה מומלצים</p>
        <select
          value={region || recommendations.region}
          onChange={(e) => onRegionChange?.(e.target.value)}
          className="rounded-sc-sm border border-sc-border bg-white px-2 py-1 text-xs font-black"
        >
          <option value="IL">ישראל (ILS)</option>
          <option value="US">ארה&quot;ב (USD)</option>
        </select>
      </div>
      <div className="mt-3 rounded-sc-sm border border-[var(--sc-accent)]/25 bg-white p-3">
        <p className="text-xs font-black text-[var(--sc-accent)]">{recommendations.primary.name}</p>
        <p className="mt-1 text-xs font-bold text-sc-muted">{recommendations.primary.description}</p>
        {recommendations.primary.supported ? (
          <p className="mt-2 text-[11px] font-black text-emerald-700">מחובר / מוכן באפליקציה</p>
        ) : (
          <p className="mt-2 text-[11px] font-bold text-amber-800">
            {recommendations.primary.note || 'נדרש חיבור API'}
          </p>
        )}
      </div>
      {recommendations.alternatives?.length ? (
        <ul className="mt-2 space-y-1 text-[11px] font-bold text-sc-muted">
          {recommendations.alternatives.map((item) => (
            <li key={item.id}>
              {item.name} — {item.description}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-3 text-[10px] font-bold text-sc-muted">
        מטבע: {recommendations.currency || 'ILS'} · תשלום בכרטיס אשראי דרך iframe מאובטח
      </p>
    </section>
  );
}
