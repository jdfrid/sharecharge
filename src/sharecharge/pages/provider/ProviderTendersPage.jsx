import { useMemo, useState } from 'react';
import { useShareCharge } from '../../context/ShareChargeContext';
import { useSyncedProviderHost } from '../../hooks/useSyncedProviderHost';
import {
  distanceToTender,
  emergencyCategoryLabel,
  tenderMatchesProvider,
} from '../../utils/emergencyProviders';
import { Card } from '../../components/ui/Card';
import { ProviderBidSheet } from '../../components/provider/ProviderBidSheet';

export function ProviderTendersPage() {
  const { state, submitTenderBid, completeTender, reviseTenderBid, confirmTenderAssignment, declineTenderAssignment } =
    useShareCharge();
  const { activeHostId: hostId } = useSyncedProviderHost(state);
  const [activeId, setActiveId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [reviseFor, setReviseFor] = useState(null);
  const [reviseTotal, setReviseTotal] = useState('');
  const [reviseEta, setReviseEta] = useState('15');

  const counterBids = useMemo(
    () =>
      (state.serviceBids || []).filter(
        (bid) =>
          bid.hostId === hostId
          && bid.status === 'pending'
          && bid.driverCounterAt
          && (state.serviceRequests || []).some((r) => r.id === bid.requestId && r.status === 'open'),
      ),
    [state.serviceBids, state.serviceRequests, hostId],
  );

  const openRequests = useMemo(
    () =>
      (state.serviceRequests || [])
        .filter((item) => item.status === 'open')
        .filter((item) => tenderMatchesProvider({ request: item, stations: state.stations, hostId }))
        .map((item) => ({
          ...item,
          distanceKm: distanceToTender({ request: item, stations: state.stations, hostId }),
        }))
        .sort((a, b) => (a.distanceKm || 999) - (b.distanceKm || 999)),
    [state.serviceRequests, state.stations, hostId],
  );

  const pendingConfirmations = useMemo(
    () => (state.serviceRequests || []).filter((item) => item.status === 'pending_provider' && item.hostId === hostId),
    [state.serviceRequests, hostId],
  );

  const myAssigned = useMemo(
    () =>
      (state.serviceRequests || []).filter(
        (item) => item.hostId === hostId && ['assigned', 'in_progress'].includes(item.status),
      ),
    [state.serviceRequests, hostId],
  );

  const categoryLabel = (id) => emergencyCategoryLabel(id);

  const handleComplete = async (requestId) => {
    setBusy(true);
    try {
      await completeTender(requestId);
    } catch (err) {
      alert(err?.message || 'סיום השירות נכשל');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card>
        <h2 className="text-lg font-black">מכרזים פתוחים</h2>
        <p className="mt-1 text-sm font-bold text-sc-muted">
          כל קריאת חירום באזור מגיעה לכל ספקי החירום — הגישו מחיר וזמן הגעה
        </p>
      </Card>

      {pendingConfirmations.length ? (
        <>
          <Card className="border-[var(--sc-accent)]/25 bg-[var(--sc-accent)]/[0.06]">
            <h2 className="text-lg font-black text-[var(--sc-accent)]">אישור הדדי — לקוח בחר אותך</h2>
            <p className="mt-1 text-sm font-bold text-sc-muted">אשרו את ההצעה כדי להתחיל · או דחו כדי להישאר פנויים</p>
          </Card>
          {pendingConfirmations.map((request) => (
            <Card key={request.id} className="ring-2 ring-[var(--sc-accent)]/20">
              <p className="font-black">{categoryLabel(request.category)}</p>
              <p className="mt-1 text-sm font-bold text-sc-muted">{request.addressText}</p>
              {request.problemDescription ? (
                <p className="mt-1 text-xs font-bold text-sc-text">{request.problemDescription}</p>
              ) : null}
              <p className="mt-2 text-lg font-black text-[var(--sc-accent)]">₪{request.amount}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await declineTenderAssignment(request.id);
                    } catch (err) {
                      alert(err?.message || 'דחייה נכשלה');
                    } finally {
                      setBusy(false);
                    }
                  }}
                  className="rounded-sc-sm border border-sc-border py-2.5 text-xs font-black"
                >
                  דחה
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await confirmTenderAssignment(request.id);
                    } catch (err) {
                      alert(err?.message || 'אישור נכשל');
                    } finally {
                      setBusy(false);
                    }
                  }}
                  className="rounded-sc-sm bg-[var(--sc-accent)] py-2.5 text-xs font-black text-white"
                >
                  מאשר — יוצא לדרך
                </button>
              </div>
            </Card>
          ))}
        </>
      ) : null}

      <div className="space-y-2">
        {openRequests.map((request) => (
          <Card key={request.id}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800">
                  {categoryLabel(request.category)}
                </span>
                <p className="mt-2 font-black">{request.addressText || 'מיקום GPS'}</p>
                {request.problemDescription ? (
                  <p className="mt-1 text-xs font-bold text-sc-text">{request.problemDescription}</p>
                ) : null}
                <p className="mt-1 text-xs font-bold text-sc-muted">
                  {request.distanceKm != null ? `${request.distanceKm.toFixed(1)} ק״מ ממך` : 'באזור השירות'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveId(request.id)}
                className="rounded-sc-sm bg-[var(--sc-accent)] px-3 py-2 text-xs font-black text-white"
              >
                הצע מחיר
              </button>
            </div>
          </Card>
        ))}
        {!openRequests.length ? (
          <p className="text-center text-sm font-bold text-sc-muted">אין קריאות חירום רלוונטיות כרגע</p>
        ) : null}
      </div>

      {myAssigned.length ? (
        <>
          <Card>
            <h2 className="text-lg font-black">שירותים פעילים</h2>
          </Card>
          {myAssigned.map((request) => (
            <Card key={request.id}>
              <p className="font-black">{categoryLabel(request.category)}</p>
              <p className="mt-1 text-sm font-bold text-sc-muted">{request.addressText}</p>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleComplete(request.id)}
                className="sc-btn-primary mt-3 !text-sm"
              >
                סיים שירות + חיוב
              </button>
            </Card>
          ))}
        </>
      ) : null}

      {counterBids.length ? (
        <>
          <Card>
            <h2 className="text-lg font-black">משא ומתן — הצעות נגדיות</h2>
          </Card>
          {counterBids.map((bid) => (
            <Card key={bid.id}>
              <p className="font-black">
                לקוח מבקש: ₪{bid.driverCounterTotal} · {bid.driverCounterEtaMinutes} דק
              </p>
              <p className="mt-1 text-xs font-bold text-sc-muted">הצעתך: ₪{bid.total} · {bid.etaMinutes} דק</p>
              {bid.driverCounterMessage ? (
                <p className="mt-1 text-xs font-bold text-sc-text">{bid.driverCounterMessage}</p>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setReviseFor(bid);
                  setReviseTotal(String(bid.driverCounterTotal || bid.total));
                  setReviseEta(String(bid.driverCounterEtaMinutes || bid.etaMinutes));
                }}
                className="sc-btn-primary mt-3 !text-sm"
              >
                עדכן הצעה
              </button>
            </Card>
          ))}
        </>
      ) : null}

      {activeId ? (
        <ProviderBidSheet
          requestId={activeId}
          category={(openRequests.find((item) => item.id === activeId) || {}).category}
          onClose={() => setActiveId(null)}
          onSubmit={async (payload) => {
            await submitTenderBid(activeId, payload);
            setActiveId(null);
          }}
        />
      ) : null}

      {reviseFor ? (
        <Card>
          <p className="text-sm font-black">עדכון הצעה ללקוח</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <input
              type="number"
              value={reviseTotal}
              onChange={(e) => setReviseTotal(e.target.value)}
              className="rounded-sc-sm border border-sc-border px-2 py-2 font-black"
              placeholder="מחיר"
            />
            <input
              type="number"
              value={reviseEta}
              onChange={(e) => setReviseEta(e.target.value)}
              className="rounded-sc-sm border border-sc-border px-2 py-2 font-black"
              placeholder="דק"
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setReviseFor(null)} className="rounded-sc-sm border border-sc-border py-2 text-xs font-black">
              ביטול
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await reviseTenderBid(reviseFor.requestId, reviseFor.id, {
                    total: Number(reviseTotal),
                    etaMinutes: Number(reviseEta),
                  });
                  setReviseFor(null);
                } catch (err) {
                  alert(err?.message || 'עדכון נכשל');
                } finally {
                  setBusy(false);
                }
              }}
              className="rounded-sc-sm bg-[var(--sc-accent)] py-2 text-xs font-black text-white"
            >
              שלח עדכון
            </button>
          </div>
        </Card>
      ) : null}
    </>
  );
}
