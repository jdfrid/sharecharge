import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useShareCharge } from '../../context/ShareChargeContext';
import { useProviderBid } from '../../context/ProviderBidContext';
import { useSyncedProviderHost } from '../../hooks/useSyncedProviderHost';
import { useProviderCounterBids } from '../../hooks/useProviderCounterBids';
import { ProviderReviseSheet } from '../../components/provider/ProviderReviseSheet';
import {
  distanceToTender,
  emergencyCategoryLabel,
  tenderMatchesProvider,
} from '../../utils/emergencyProviders';
import { Card } from '../../components/ui/Card';

export function ProviderTendersPage() {
  const location = useLocation();
  const { state, completeTender, reviseTenderBid, confirmTenderAssignment, declineTenderAssignment } =
    useShareCharge();
  const { openBid } = useProviderBid();
  const { activeHostId: hostId, sessionEmail, activeHost } = useSyncedProviderHost(state);
  const { counterBids } = useProviderCounterBids({ enabled: !!hostId });
  const [busy, setBusy] = useState(false);
  const [reviseFor, setReviseFor] = useState(null);
  const [reviseTotal, setReviseTotal] = useState('');
  const [reviseEta, setReviseEta] = useState('15');

  const myBidFor = (requestId) =>
    (state.serviceBids || []).find(
      (bid) => bid.requestId === requestId && bid.hostId === hostId && bid.status === 'pending',
    );

  const counterRequestIds = useMemo(() => new Set(counterBids.map((bid) => bid.requestId)), [counterBids]);

  useEffect(() => {
    const reviseBidId = location.state?.reviseBidId;
    if (!reviseBidId) return;
    const bid =
      counterBids.find((item) => item.id === reviseBidId)
      || (state.serviceBids || []).find((item) => item.id === reviseBidId);
    if (!bid) return;
    setReviseFor(bid);
    setReviseTotal(String(bid.driverCounterTotal || bid.total));
    setReviseEta(String(bid.driverCounterEtaMinutes || bid.etaMinutes));
  }, [location.state, counterBids, state.serviceBids]);

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

  const newCalls = useMemo(
    () => openRequests.filter((item) => !myBidFor(item.id) && !counterRequestIds.has(item.id)),
    [openRequests, counterRequestIds, state.serviceBids, hostId],
  );

  const submittedWaiting = useMemo(
    () =>
      openRequests.filter((item) => {
        const bid = myBidFor(item.id);
        return bid && !bid.driverCounterAt && !counterRequestIds.has(item.id);
      }),
    [openRequests, counterRequestIds, state.serviceBids, hostId],
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
  const requestForBid = (bid) => (state.serviceRequests || []).find((item) => item.id === bid.requestId);

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

  const submitRevise = async () => {
    if (!reviseFor) return;
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
  };

  return (
    <>
      {counterBids.length ? (
        <section className="space-y-2 rounded-sc-lg border-2 border-violet-200 bg-violet-50/50 p-3">
          <div className="px-1">
            <h2 className="text-lg font-black text-violet-900">משא ומתן — הצעות נגדיות</h2>
            <p className="mt-1 text-sm font-bold text-violet-800/80">
              לקוחות שלחו הצעה נגדית · עדכנו מחיר ושלחו חזרה
            </p>
          </div>
          {counterBids.map((bid) => {
            const request = requestForBid(bid);
            return (
              <Card key={bid.id} className="!border-violet-200 !bg-white ring-2 ring-violet-300/40">
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-black text-violet-800">
                  {categoryLabel(request?.category)}
                </span>
                <p className="mt-2 font-black">{request?.addressText || 'מיקום GPS'}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-sc-sm bg-violet-100/80 p-2">
                    <p className="text-[10px] font-bold text-violet-700">לקוח מבקש</p>
                    <p className="font-black text-violet-900">
                      ₪{bid.driverCounterTotal} · {bid.driverCounterEtaMinutes} דק
                    </p>
                  </div>
                  <div className="rounded-sc-sm bg-sc-surface p-2">
                    <p className="text-[10px] font-bold text-sc-muted">הצעתך</p>
                    <p className="font-black">₪{bid.total} · {bid.etaMinutes} דק</p>
                  </div>
                </div>
                {bid.driverCounterMessage ? (
                  <p className="mt-2 text-xs font-bold text-sc-text">{bid.driverCounterMessage}</p>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setReviseFor(bid);
                    setReviseTotal(String(bid.driverCounterTotal || bid.total));
                    setReviseEta(String(bid.driverCounterEtaMinutes || bid.etaMinutes));
                  }}
                  className="mt-3 min-h-[48px] w-full touch-manipulation rounded-sc-sm bg-violet-600 py-3 text-sm font-black text-white"
                >
                  אשר / עדכן הצעה ללקוח
                </button>
              </Card>
            );
          })}
        </section>
      ) : null}

      <Card>
        <h2 className="text-lg font-black">מכרזים פתוחים</h2>
        <p className="mt-1 text-sm font-bold text-sc-muted">קריאות חדשות · הצעות שהוגשו · מעקב</p>
        {sessionEmail ? (
          <p className="mt-2 text-xs font-bold text-sc-muted">
            מחובר כ־{sessionEmail}
            {activeHost?.name ? ` · ${activeHost.name}` : ''}
          </p>
        ) : null}
      </Card>

      {pendingConfirmations.length ? (
        <>
          <Card className="border-[var(--sc-accent)]/25 bg-[var(--sc-accent)]/[0.06]">
            <h2 className="text-lg font-black text-[var(--sc-accent)]">אישור הדדי — לקוח בחר אותך</h2>
          </Card>
          {pendingConfirmations.map((request) => (
            <Card key={request.id} className="ring-2 ring-[var(--sc-accent)]/20">
              <p className="font-black">{categoryLabel(request.category)}</p>
              <p className="mt-1 text-sm font-bold text-sc-muted">{request.addressText}</p>
              <p className="mt-2 text-lg font-black text-[var(--sc-accent)]">₪{request.amount}</p>
              <p className="mt-2 text-xs font-bold text-sc-muted">
                לקוח אישר · ממתין לאישורכם + אישור מיזם ShareCharge
              </p>
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
                  className="min-h-[44px] rounded-sc-sm border border-sc-border py-2.5 text-xs font-black"
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
                  className="min-h-[44px] rounded-sc-sm bg-[var(--sc-accent)] py-2.5 text-xs font-black text-white"
                >
                  מאשר — יוצא לדרך
                </button>
              </div>
            </Card>
          ))}
        </>
      ) : null}

      {newCalls.length ? (
        <>
          <Card className="border-amber-200/60 bg-amber-50/40">
            <h2 className="text-sm font-black text-amber-900">קריאות חדשות — הגישו הצעה</h2>
          </Card>
          <div className="space-y-2">
            {newCalls.map((request) => (
              <Card key={request.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800">
                      {categoryLabel(request.category)}
                    </span>
                    <p className="mt-2 font-black">{request.addressText || 'מיקום GPS'}</p>
                    <p className="mt-1 text-xs font-bold text-sc-muted">
                      {request.distanceKm != null ? `${request.distanceKm.toFixed(1)} ק״מ ממך` : 'באזור השירות'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openBid(request.id)}
                    className="min-h-[44px] shrink-0 rounded-sc-sm bg-[var(--sc-accent)] px-4 py-2.5 text-xs font-black text-white"
                  >
                    הצע מחיר
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </>
      ) : null}

      {submittedWaiting.length ? (
        <>
          <Card>
            <h2 className="text-sm font-black text-sc-muted">הצעות שהוגשו — ממתינות ללקוח</h2>
          </Card>
          <div className="space-y-2">
            {submittedWaiting.map((request) => {
              const existingBid = myBidFor(request.id);
              return (
                <Card key={request.id} className="opacity-90">
                  <p className="font-black">{categoryLabel(request.category)}</p>
                  <p className="mt-1 text-sm font-bold text-sc-muted">{request.addressText}</p>
                  <p className="mt-2 text-xs font-black text-[var(--sc-accent)]">
                    הצעה: ₪{existingBid?.total} · {existingBid?.etaMinutes} דק · ממתין ללקוח
                  </p>
                  <button
                    type="button"
                    onClick={() => openBid(request.id)}
                    className="mt-3 min-h-[40px] rounded-sc-sm border border-sc-border px-3 py-2 text-xs font-black"
                  >
                    עדכן הצעה
                  </button>
                </Card>
              );
            })}
          </div>
        </>
      ) : null}

      {!newCalls.length && !submittedWaiting.length && !counterBids.length && !pendingConfirmations.length ? (
        <p className="text-center text-sm font-bold text-sc-muted">אין קריאות חירום רלוונטיות כרגע</p>
      ) : null}

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

      {reviseFor ? (
        <ProviderReviseSheet
          counterTotal={reviseFor.driverCounterTotal}
          counterEta={reviseFor.driverCounterEtaMinutes}
          yourTotal={reviseFor.total}
          yourEta={reviseFor.etaMinutes}
          total={reviseTotal}
          eta={reviseEta}
          onTotalChange={setReviseTotal}
          onEtaChange={setReviseEta}
          onClose={() => setReviseFor(null)}
          onSubmit={submitRevise}
          busy={busy}
        />
      ) : null}
    </>
  );
}
