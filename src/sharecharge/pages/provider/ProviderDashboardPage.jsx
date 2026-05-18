import { Wallet } from 'lucide-react';
import { useShareCharge } from '../../context/ShareChargeContext';
import { useSyncedProviderHost } from '../../hooks/useSyncedProviderHost';
import { currency } from '../../utils';
import { Card } from '../../components/ui/Card';

export function ProviderDashboardPage() {
  const { state, updateStation } = useShareCharge();
  const { hosts, activeHostId, setActiveHostId, activeHost } = useSyncedProviderHost(state);  const hostStations = state.stations.filter((station) => station.hostId === activeHost?.id);
  const revenue = state.transactions.filter((tx) => tx.hostId === activeHost?.id).reduce((sum, tx) => sum + tx.hostShare, 0);

  return (
    <>
      <Card className="bg-sc-text text-white">
        <label className="mb-3 block text-sm font-bold text-white/75">
          ספק פעיל
          <select
            value={activeHost?.id || ''}
            onChange={(e) => setActiveHostId(e.target.value)}
            className="mt-2 w-full rounded-sc-sm bg-white/10 px-3 py-3 font-black text-white outline-none"
          >
            {hosts.map((host) => (
              <option key={host.id} value={host.id} className="text-sc-text">
                {host.name}
              </option>
            ))}
          </select>
        </label>
        <p className="text-sm text-white/65">יתרה צמודה לעסקאות בדמו</p>
        <div className="mt-2 flex items-end justify-between gap-2">
          <p className="text-3xl font-black">{currency((activeHost?.revenue || 0) + revenue)}</p>
          <Wallet className="text-teal-300" size={30} />
        </div>
        <p className="mt-3 text-sm text-white/55">
          מחובר כ־{activeHost?.email || '—'} · {hostStations.length} עמדות · עדכנו מחיר, זמינות ותנאים למטה.
        </p>      </Card>

      <Card>
        <div className="mb-4">
          <p className="text-sm font-black text-[var(--sc-accent)]">העמדות שלי</p>
          <h2 className="text-xl font-black">{activeHost?.name || 'ספק'}</h2>
        </div>
        {hostStations.length === 0 ? (
          <p className="rounded-sc-sm bg-slate-50 p-4 text-sm text-sc-muted">אין עמדות — הוסיפו במסך מנהל המערכת.</p>
        ) : (
          <div className="space-y-3">
            {hostStations.map((station) => (
              <div key={station.id} className="rounded-sc-md bg-slate-50 p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-black">{station.name}</p>
                    <p className="text-xs text-sc-muted">{station.address}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateStation(station.id, { available: !station.available })}
                    className={`shrink-0 rounded-sc-sm px-3 py-2 text-xs font-black ${
                      station.available ? 'bg-teal-100 text-teal-800' : 'bg-red-100 text-red-800'
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
                      className="mt-1 w-full rounded-sc-sm bg-white px-3 py-2 font-black outline-none ring-1 ring-slate-100"
                    />
                  </label>
                  <label className="text-xs font-bold text-sc-muted">
                    הספק kW
                    <input
                      type="number"
                      value={station.power}
                      onChange={(e) => updateStation(station.id, { power: Number(e.target.value) })}
                      className="mt-1 w-full rounded-sc-sm bg-white px-3 py-2 font-black outline-none ring-1 ring-slate-100"
                    />
                  </label>
                </div>
                <label className="mt-3 block text-xs font-bold text-sc-muted">
                  תנאים להטענה (גלויים ללקוח בדמו)
                  <textarea
                    value={station.termsText || ''}
                    onChange={(e) => updateStation(station.id, { termsText: e.target.value })}
                    rows={3}
                    className="mt-1 w-full resize-none rounded-sc-sm bg-white px-3 py-2 text-sm font-bold outline-none ring-1 ring-slate-100"
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
