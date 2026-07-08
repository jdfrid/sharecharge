import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Loader2, Star } from 'lucide-react';
import { useShareCharge } from '../../context/ShareChargeContext';
import { useTenders } from '../../hooks/useTenders';
import { notifyNewTenderBid } from '../../hooks/usePushNotifications';
import { requireClientAuth } from '../../utils/requireClientAuth';
import { currency } from '../../utils';
import { Card } from '../../components/ui/Card';

export function ClientTenderOffersPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, acceptTenderBid, counterTenderBid } = useShareCharge();
  const { bidsFor, refresh } = useTenders();
  const [busy, setBusy] = useState(null);
  const [counterFor, setCounterFor] = useState(null);
  const [counterTotal, setCounterTotal] = useState('');
  const [counterEta, setCounterEta] = useState('15');
  const [counterMessage, setCounterMessage] = useState('');
  const prevBidCount = useRef(0);

  useEffect(() => {
    const timer = setInterval(() => refresh?.('client'), 5000);
    return () => clearInterval(timer);
  }, [refresh]);

  const request = state.serviceRequests?.find((item) => item.id === id);
  const bids = useMemo(() => bidsFor(id).filter((item) => item.status === 'pending'), [bidsFor, id]);

  useEffect(() => {
    if (request?.status === 'assigned') {
      navigate(`/client/track/${id}`, { replace: true });
    }
  }, [request?.status, id, navigate]);

  useEffect(() => {
    if (bids.length > prevBidCount.current && prevBidCount.current > 0) {
      const latest = bids[bids.length - 1];
      notifyNewTenderBid({
        providerName: state.users.find((u) => u.id === latest.hostId)?.name,
        total: latest.total,
        etaMinutes: latest.etaMinutes,
      });
    }
    prevBidCount.current = bids.length;
  }, [bids, state.users]);

  const hostName = (hostId) => state.users.find((user) => user.id === hostId)?.name || 'ספק';

  const chooseBid = async (bidId) => {
    const intent = { type: 'accept_bid', requestId: id, bidId, returnTo: `/client/tender/${id}/offers` };
    if (!requireClientAuth(navigate, intent, intent.returnTo)) return;

    setBusy(bidId);
    try {
      await acceptTenderBid(id, bidId);
      await refresh?.('client');
    } catch (err) {
      alert(err?.message || 'בחירת ההצעה נכשלה');
    } finally {
      setBusy(null);
    }
  };

  const submitCounter = async () => {
    if (!counterFor) return;
    setBusy(counterFor);
    try {
      await counterTenderBid(id, counterFor, {
        total: Number(counterTotal),
        etaMinutes: Number(counterEta),
        message: counterMessage,
      });
      setCounterFor(null);
      await refresh?.('client');
    } catch (err) {
      alert(err?.message || 'שליחת הצעה נגדית נכשלה');
    } finally {
      setBusy(null);
    }
  };

  if (!request) {
    return (
      <Card>
        <p className="text-sm font-bold text-sc-muted">טוען הצעות…</p>
      </Card>
    );
  }

  const waitingForProvider = request.status === 'pending_provider';
  const selectedHost = waitingForProvider
    ? state.users.find((user) => user.id === request.hostId)?.name
    : null;

  return (
    <>
      <Link
        to="/client/home"
        className="mb-2 inline-flex items-center gap-1 rounded-full border border-sc-border bg-white px-3 py-2 text-sm font-black text-[var(--sc-accent)]"
      >
        <ChevronLeft size={18} />
        בית
      </Link>

      <Card className="border-[var(--sc-accent)]/20">
        <h1 className="text-xl font-black text-[var(--sc-accent)]">עזרה בדרך!</h1>
        <p className="mt-1 text-sm font-bold text-sc-muted">{request.addressText || 'מיקום GPS'}</p>
        {request.problemDescription ? (
          <p className="mt-2 text-sm font-bold text-sc-text">{request.problemDescription}</p>
        ) : null}
      </Card>

      {waitingForProvider ? (
        <Card className="border-amber-200 bg-amber-50/90">
          <div className="flex items-center gap-2">
            <Loader2 size={18} className="animate-spin text-amber-700" />
            <p className="font-black text-amber-900">ממתין לאישור ספק</p>
          </div>
          <p className="mt-2 text-sm font-bold text-sc-muted">
            בחרת את {selectedHost || 'הספק'} · {currency(request.amount)} — הספק צריך לאשר באפליקציה
          </p>
          <p className="mt-1 text-xs font-bold text-sc-muted">לאחר אישור הספק תועברו אוטומטית למעקב</p>
        </Card>
      ) : null}

      {!waitingForProvider ? (
        <div className="space-y-2">
          {bids.map((bid) => (
            <div
              key={bid.id}
              className="w-full rounded-sc-md border border-white/90 bg-white/85 p-4 text-right shadow-sm backdrop-blur-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black text-sc-text">{hostName(bid.hostId)}</p>
                  <p className="mt-1 text-xs font-bold text-sc-muted">
                    {(bid.lineItems || []).map((line) => line.label).join(' · ')}
                  </p>
                  {bid.driverCounterTotal != null ? (
                    <p className="mt-2 text-[11px] font-bold text-amber-800">
                      הצעה נגדית שלך: {currency(bid.driverCounterTotal)} · {bid.driverCounterEtaMinutes} דק
                    </p>
                  ) : null}
                  <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-amber-600">
                    <Star size={12} />
                    4.8
                  </p>
                </div>
                <div className="text-left">
                  <p className="text-lg font-black text-[var(--sc-accent)]">{currency(bid.total)}</p>
                  <p className="text-xs font-bold text-sc-muted">{bid.etaMinutes} דק</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={busy === bid.id}
                  onClick={() => chooseBid(bid.id)}
                  className="rounded-sc-sm bg-[var(--sc-accent)] py-2.5 text-xs font-black text-white disabled:opacity-60"
                >
                  {busy === bid.id ? '…' : 'בחר הצעה'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCounterFor(bid.id);
                    setCounterTotal(String(Math.max(0, Math.round(bid.total * 0.85))));
                    setCounterEta(String(bid.etaMinutes));
                  }}
                  className="rounded-sc-sm border border-sc-border bg-white py-2.5 text-xs font-black text-sc-text"
                >
                  הצעה נגדית
                </button>
              </div>
            </div>
          ))}
          {!bids.length ? (
            <p className="rounded-sc-md border border-dashed border-sc-border p-6 text-center text-sm font-bold text-sc-muted">
              ממתין להצעות מספקי חירום באזור…
            </p>
          ) : null}
        </div>
      ) : null}

      {counterFor ? (
        <Card>
          <p className="text-sm font-black text-[var(--sc-accent)]">הצעה נגדית — מחיר וזמן</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="text-xs font-bold text-sc-muted">
              מחיר (₪)
              <input
                type="number"
                value={counterTotal}
                onChange={(e) => setCounterTotal(e.target.value)}
                className="mt-1 w-full rounded-sc-sm border border-sc-border px-2 py-2 font-black"
              />
            </label>
            <label className="text-xs font-bold text-sc-muted">
              זמן (דק)
              <input
                type="number"
                value={counterEta}
                onChange={(e) => setCounterEta(e.target.value)}
                className="mt-1 w-full rounded-sc-sm border border-sc-border px-2 py-2 font-black"
              />
            </label>
          </div>
          <input
            value={counterMessage}
            onChange={(e) => setCounterMessage(e.target.value)}
            placeholder="הערה לספק (אופציונלי)"
            className="mt-2 w-full rounded-sc-sm border border-sc-border px-3 py-2 text-sm font-bold"
          />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setCounterFor(null)} className="rounded-sc-sm border border-sc-border py-2 text-xs font-black">
              ביטול
            </button>
            <button type="button" onClick={submitCounter} className="rounded-sc-sm bg-[var(--sc-accent)] py-2 text-xs font-black text-white">
              שלח הצעה נגדית
            </button>
          </div>
        </Card>
      ) : null}
    </>
  );
}
