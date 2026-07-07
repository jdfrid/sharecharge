import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useShareCharge } from '../../context/ShareChargeContext';
import { PaymentAmountHero } from '../../components/payment/PaymentAmountHero';
import { PaymentSplitEditor } from '../../components/payment/PaymentSplitEditor';
import { TranzilaIframeCheckout } from '../../components/payment/TranzilaIframeCheckout';
import { PaymentGatewayPanel } from '../../components/payment/PaymentGatewayPanel';
import { Card } from '../../components/ui/Card';
import { currency } from '../../utils';
import { getApiBase, sharechargeApi } from '../../data/sharechargeApi';
import { defaultCardSplit, paymentStatusLabel, validateCardSplits } from '../../utils/paymentUtils';

export function ClientPaymentPage() {
  const { refType, refId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { state, createPaymentCheckout, updatePaymentSplits, createTranzilaSession, refreshFromApi } = useShareCharge();
  const [payment, setPayment] = useState(null);
  const [cardSplits, setCardSplits] = useState([]);
  const [session, setSession] = useState(null);
  const [splitIndex, setSplitIndex] = useState(() => Number(searchParams.get('split') || 0));
  const [step, setStep] = useState('review');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [tranzilaReady, setTranzilaReady] = useState(null);
  const [payRegion, setPayRegion] = useState('IL');
  const [gateways, setGateways] = useState(null);

  const context = useMemo(() => {
    if (refType === 'booking') {
      const booking = state.bookings.find((item) => item.id === refId);
      const station = booking ? state.stations.find((item) => item.id === booking.stationId) : null;
      return {
        title: station ? `טעינה · ${station.name}` : 'תשלום טעינה',
        amount: Number(booking?.amount || 0),
        platformFee: Number(booking?.platformFee || 0),
        hostShare: Number(booking?.hostShare || 0),
        hostId: booking?.hostId,
      };
    }
    if (refType === 'tender') {
      const tender = state.serviceRequests?.find((item) => item.id === refId);
      const amount = Number(tender?.amount || 0);
      const platformFee = Number((amount * state.settings.commission) / 100).toFixed(2);
      const hostShare = Number((amount - platformFee).toFixed(2));
      return {
        title: 'שירות חירום',
        amount,
        platformFee: Number(platformFee),
        hostShare,
        hostId: tender?.hostId,
      };
    }
    return { title: 'תשלום', amount: 0, platformFee: 0, hostShare: 0 };
  }, [refType, refId, state]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!context.amount) return;
      try {
        setBusy(true);
        const created = await createPaymentCheckout({
          referenceType: refType,
          referenceId: refId,
          ...context,
          cardSplits: defaultCardSplit(context.amount),
        });
        if (cancelled) return;
        setPayment(created);
        setCardSplits(
          created.splits
            ?.filter((s) => s.splitType === 'card_charge')
            .map((s) => ({ cardLast4: s.cardLast4, cardBrand: s.cardBrand, amount: s.amount, token: 'default' })) ||
            defaultCardSplit(context.amount),
        );
      } catch (err) {
        if (!cancelled) setError(err.message || 'יצירת תשלום נכשלה');
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refType, refId, context.amount]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await sharechargeApi.fetchPaymentGateways('client', payRegion);
        if (!cancelled) setGateways(data);
      } catch {
        if (!cancelled) setGateways(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [payRegion]);

  useEffect(() => {
    if (searchParams.get('split') != null) {
      setSplitIndex(Number(searchParams.get('split') || 0));
      setStep('checkout');
    }
  }, [searchParams]);

  const methods = state.paymentMethods || [];

  const saveSplits = async (nextSplits) => {
    setCardSplits(nextSplits);
    if (!payment?.id || !validateCardSplits(context.amount, nextSplits)) return;
    try {
      const updated = await updatePaymentSplits(payment.id, nextSplits);
      setPayment(updated);
    } catch (err) {
      setError(err.message || 'עדכון חלוקה נכשל');
    }
  };

  const startTranzila = async () => {
    if (!payment?.id) return;
    if (!validateCardSplits(context.amount, cardSplits)) {
      setError('סכום החלוקה חייב להיות שווה לסכום התשלום');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await updatePaymentSplits(payment.id, cardSplits);
      const nextSession = await createTranzilaSession(payment.id, splitIndex);
      setSession(nextSession);
      setTranzilaReady(nextSession.mock ? false : true);
      setStep('checkout');
    } catch (err) {
      setError(err.message || 'פתיחת Tranzila נכשלה');
    } finally {
      setBusy(false);
    }
  };

  const onTranzilaComplete = async () => {
    setBusy(true);
    try {
      if (session?.mock) {
        const apiBase = getApiBase();
        await fetch(`${apiBase}/payments/tranzila/notify?paymentId=${encodeURIComponent(payment.id)}&splitIndex=${splitIndex}&Response=000&index=mock-${Date.now()}`);
      }
      await refreshFromApi?.();

      if (splitIndex + 1 < cardSplits.length) {
        const next = splitIndex + 1;
        setSplitIndex(next);
        const nextSession = await createTranzilaSession(payment.id, next);
        setSession(nextSession);
        setStep('checkout');
        setError('');
        return;
      }

      navigate(`/client/receipt/${refId}`, { replace: true });
    } catch (err) {
      setError(err.message || 'אימות תשלום נכשל');
    } finally {
      setBusy(false);
    }
  };

  if (!context.amount) {
    return (
      <>
        <Link to="/client/activity" className="mb-1 inline-flex items-center gap-1 rounded-full bg-white px-3 py-2 text-sm font-black text-[var(--sc-accent)] ring-1 ring-sc-border">
          <ChevronLeft size={18} />
          חזרה
        </Link>
        <Card>
          <p className="text-center text-sm font-bold text-sc-muted">אין סכום לתשלום עדיין — המתינו לסיום השירות.</p>
        </Card>
      </>
    );
  }

  return (
    <>
      <Link to="/client/activity" className="mb-1 inline-flex items-center gap-1 rounded-full bg-white px-3 py-2 text-sm font-black text-[var(--sc-accent)] ring-1 ring-sc-border">
        <ChevronLeft size={18} />
        חזרה
      </Link>

      <PaymentAmountHero
        amount={context.amount}
        title="סכום לתשלום"
        subtitle={context.title}
        status={payment ? paymentStatusLabel(payment.status) : 'ממתין'}
      />

      {step === 'review' ? (
        <>
          <Card className="-mt-2">
            <h2 className="text-base font-black">פירוט</h2>
            <div className="mt-3 space-y-2 text-sm">
              <Row label="סכום שירות" value={currency(context.amount)} />
              <Row label="עמלת פלטפורמה" value={currency(context.platformFee)} />
              <Row label="לספק" value={currency(context.hostShare)} />
            </div>
          </Card>

          <PaymentGatewayPanel
            recommendations={gateways}
            region={payRegion}
            onRegionChange={setPayRegion}
          />

          <PaymentSplitEditor totalAmount={context.amount} splits={cardSplits} methods={methods} onChange={saveSplits} />

          <button type="button" disabled={busy} onClick={startTranzila} className="sc-btn-primary">
            {busy ? 'פותח Tranzila…' : `המשך לתשלום מאובטח · ${currency(context.amount)}`}
          </button>
        </>
      ) : (
        <Card>
          <TranzilaIframeCheckout
            session={session}
            busy={busy}
            onComplete={onTranzilaComplete}
            onError={(err) => setError(err.message)}
          />
        </Card>
      )}

      {tranzilaReady === false && session?.mock ? null : null}
      {error ? <p className="mt-3 text-center text-sm font-bold text-[var(--sc-danger)]">{error}</p> : null}
    </>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-bold text-sc-muted">{label}</span>
      <span className="font-black text-sc-text">{value}</span>
    </div>
  );
}
