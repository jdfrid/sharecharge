import { Wallet } from 'lucide-react';
import { useShareCharge } from '../../context/ShareChargeContext';
import { useSyncedProviderHost } from '../../hooks/useSyncedProviderHost';
import { currency } from '../../utils';
import { Card } from '../../components/ui/Card';

export function ProviderDashboardPage() {
  const { state, updateStation } = useShareCharge();
  const { hosts, activeHostId, setActiveHostId, activeHost } = useSyncedProviderHost(state);
  const hostStations = state.stations.filter((station) => station.hostId === activeHost?.id);
  const revenue = state.transactions.filter((tx) => tx.hostId === activeHost?.id).reduce((sum, tx) => sum + tx.hostShare, 0);

  return (
    <>
      <Card>
        <label className="mb-3 block text-sm font-bold text-sc-muted">
          ספק פעיל
          <select
            value={activeHost?.id || ''}
            onChange={(e) => setActiveHostId(e.target.value)}
            className="mt-2 w-full rounded-sc-sm border border-sc-border bg-white px-3 py-3 font-black text-sc-text outline-none focus:border-[var(--sc-accent-2)] focus:ring-2 focus:ring-[var(--sc-accent-2)]/20"
          >
            {hosts.map((host) => (
              <option key={host.id} value={host.id} className="text-sc-text">
                {host.name}
              </option>
            ))}
          </select>
        </label>
        <p className="text-sm text-sc-muted">יתרה לפי עסקאות במערכת</p>
        <div className="mt-2 flex items-end justify-between gap-2">
          <p className="text-3xl font-black">{currency((activeHost?.revenue || 0) + revenue)}</p>
          <Wallet className="text-[var(--sc-accent-2)]" size={30} />
        </div>
        <p className="mt-3 text-sm text-sc-muted">
          מחובר כ־{activeHost?.email || '—'} · {hostStations.length} עמדות · עדכנו מחיר, זמינות ותנאים למטה.
        </p>
      </Card>

      <Card>
        <div className="mb-4">
          <p className="text-sm font-black text-[var(--sc-accent)]">העמדות שלי</p>
          <h2 className="text-xl font-black">{activeHost?.name || 'ספק'}</h2>
        </div>
        {hostStations.length === 0 ? (
          <p className="rounded-sc-sm border border-sc-border bg-sc-surface p-4 text-sm text-sc-muted">אין עמדות — הוסיפו במסך מנהל המערכת.</p>
        ) : (
          <div className="space-y-3">
            {hostStations.map((station) => (
              <div key={station.id} className="rounded-sc-md border border-sc-border bg-sc-surface p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-black">{station.name}</p>
                    <p className="text-xs text-sc-muted">{station.address}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateStation(station.id, { available: !station.available })}
                    className={`shrink-0 rounded-sc-sm px-3 py-2 text-xs font-black ${
                      station.available
                        ? 'bg-[var(--sc-accent-2)]/12 text-[var(--sc-accent-2)]'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {station.available ? 'זמינה' : 'לא זמינה'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs font-bold text-sc-muted">
                    מחיר לקוט״ש
                    <input
                      type="number"
                      step="0.05"
                      value={station.pricePerKwh}
                      onChange={(e) => updateStation(station.id, { pricePerKwh: Number(e.target.value) })}
                      className="mt-1 w-full rounded-sc-sm border border-sc-border bg-white px-3 py-2 font-black outline-none focus:border-[var(--sc-accent-2)] focus:ring-1 focus:ring-[var(--sc-accent-2)]/25"
                    />
                  </label>
                  <label className="text-xs font-bold text-sc-muted">
                    הספק kW
                    <input
                      type="number"
                      value={station.power}
                      onChange={(e) => updateStation(station.id, { power: Number(e.target.value) })}
                      className="mt-1 w-full rounded-sc-sm border border-sc-border bg-white px-3 py-2 font-black outline-none focus:border-[var(--sc-accent-2)] focus:ring-1 focus:ring-[var(--sc-accent-2)]/25"
                    />
                  </label>
                </div>
                <label className="mt-3 block text-xs font-bold text-sc-muted">
                  תנאים להטענה (גלויים ללקוח)
                  <textarea
                    value={station.termsText || ''}
                    onChange={(e) => updateStation(station.id, { termsText: e.target.value })}
                    rows={3}
                    className="mt-1 w-full resize-none rounded-sc-sm border border-sc-border bg-white px-3 py-2 text-sm font-bold outline-none focus:border-[var(--sc-accent-2)] focus:ring-1 focus:ring-[var(--sc-accent-2)]/25"
                  />
                </label>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
