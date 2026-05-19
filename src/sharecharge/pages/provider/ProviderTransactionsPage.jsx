import { useShareCharge } from '../../context/ShareChargeContext';
import { useSyncedProviderHost } from '../../hooks/useSyncedProviderHost';
import { currency, shortTime } from '../../utils';
import { Card } from '../../components/ui/Card';

export function ProviderTransactionsPage() {
  const { state } = useShareCharge();
  const { hosts, activeHostId, setActiveHostId } = useSyncedProviderHost(state);
  const txs = state.transactions.filter((tx) => tx.hostId === activeHostId);
  const stationName = (id) => state.stations.find((s) => s.id === id)?.name || id;

  return (
    <>
      <Card>
        <label className="block text-sm font-bold text-sc-muted">
          ספק
          <select
            value={activeHostId}
            onChange={(e) => setActiveHostId(e.target.value)}
            className="mt-2 w-full rounded-sc-sm border border-sc-border bg-white px-3 py-3 font-black outline-none focus:border-[var(--sc-accent-2)] focus:ring-2 focus:ring-[var(--sc-accent-2)]/20"
          >
            {hosts.map((host) => (
              <option key={host.id} value={host.id}>
                {host.name}
              </option>
            ))}
          </select>
        </label>
      </Card>

      <Card>
        <h3 className="mb-3 font-black">כל העסקאות</h3>
        {txs.length === 0 ? (
          <p className="rounded-sc-sm border border-sc-border bg-sc-surface p-4 text-sm text-sc-muted">עדיין אין עסקאות שהושלמו לספק זה.</p>
        ) : (
          <div className="space-y-2">
            {txs.map((tx) => (
              <div key={tx.id} className="rounded-sc-sm border border-sc-border bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate font-black">{stationName(tx.stationId)}</p>
                  <strong className="shrink-0">{currency(tx.amount)}</strong>
                </div>
                <p className="mt-1 text-xs text-sc-muted">
                  {shortTime(tx.createdAt)} · {tx.kwh} kWh · לספק {currency(tx.hostShare)} · עמלה {currency(tx.platformFee)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
