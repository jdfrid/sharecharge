import { Link, useLocation, useParams } from 'react-router-dom';
import { ChevronLeft, Share2 } from 'lucide-react';
import { useShareCharge } from '../../context/ShareChargeContext';
import { currency } from '../../utils';
import { paymentStatusLabel } from '../../utils/paymentUtils';
import { Card } from '../../components/ui/Card';
import { StatusPill } from '../../components/ui/StatusPill';

export function ClientReceiptPage() {
  const { id } = useParams();
  const location = useLocation();
  const { state } = useShareCharge();
  const booking = state.bookings.find((item) => item.id === id);
  const tender = state.serviceRequests?.find((item) => item.id === id);
  const station = booking ? state.stations.find((item) => item.id === booking.stationId) : null;
  const payment =
    location.state?.payment ||
    (state.payments || []).find(
      (item) => item.referenceId === id && (item.referenceType === (booking ? 'booking' : 'tender')),
    );

  const title = booking ? station?.name : tender ? 'שירות חירום' : 'קבלה';
  const amount = booking?.amount || tender?.amount || 0;
  const refType = booking ? 'booking' : 'tender';
  const lines = booking
    ? [
        ['אנרגיה', `${booking.kwh || 0} kWh`],
        ['עלות', currency(booking.amount || 0)],
        ['עמלה', currency(booking.platformFee || 0)],
        ['סה״כ', currency(booking.amount || 0)],
      ]
    : tender
      ? [['שירות', currency(tender.amount || 0)], ['סה״כ', currency(tender.amount || 0)]]
      : [];

  const shareReceipt = async () => {
    const text = `ShareCharge · ${title}\nסה״כ: ${currency(amount)}${payment?.gatewayTxnId ? `\nTranzila: ${payment.gatewayTxnId}` : ''}`;
    if (navigator.share) {
      await navigator.share({ title: 'קבלה ShareCharge', text });
    } else {
      await navigator.clipboard?.writeText(text);
      alert('הקבלה הועתקה');
    }
  };

  return (
    <>
      <Link
        to="/client/payments"
        className="mb-2 inline-flex items-center gap-1 rounded-full bg-white px-3 py-2 text-sm font-black text-[var(--sc-accent)] ring-1 ring-sc-border"
      >
        <ChevronLeft size={18} />
        ריכוז תשלומים
      </Link>

      <Card>
        <StatusPill status={payment?.status || booking?.status || tender?.status || 'completed'} />
        <h1 className="mt-3 text-xl font-black">סיכום וקבלה</h1>
        <p className="mt-1 text-sm font-bold text-sc-muted">{title}</p>

        {payment ? (
          <div className="mt-4 rounded-[var(--sc-radius-md)] bg-sc-surface p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sc-muted">סטטוס תשלום</span>
              <span className="font-black text-[var(--sc-success)]">{paymentStatusLabel(payment.status)}</span>
            </div>
            {payment.gatewayTxnId ? (
              <p className="mt-2 text-xs font-bold text-sc-muted">Tranzila · {payment.gatewayTxnId}</p>
            ) : null}
          </div>
        ) : amount > 0 ? (
          <Link
            to={`/client/payment/${refType}/${id}`}
            className="mt-4 flex w-full items-center justify-center rounded-[var(--sc-radius-md)] bg-[var(--sc-accent)] py-3 text-sm font-black text-white"
          >
            לתשלום · {currency(amount)}
          </Link>
        ) : null}

        <div className="mt-4 space-y-2">
          {lines.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between text-sm">
              <span className="font-bold text-sc-muted">{label}</span>
              <span className="font-black text-sc-text">{value}</span>
            </div>
          ))}
        </div>

        {payment?.splits?.length ? (
          <div className="mt-4 border-t border-sc-border pt-4">
            <p className="text-xs font-black text-sc-muted">חלוקת תשלום</p>
            <div className="mt-2 space-y-1">
              {payment.splits.map((split) => (
                <div key={split.id} className="flex items-center justify-between text-xs">
                  <span className="font-bold text-sc-muted">
                    {split.splitType === 'card_charge'
                      ? `כרטיס ···${split.cardLast4}`
                      : split.splitType === 'platform'
                        ? 'עמלת פלטפורמה'
                        : 'תשלום לספק'}
                  </span>
                  <span className="font-black">{currency(split.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <button
          type="button"
          onClick={shareReceipt}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-sc-md border border-sc-border bg-white py-3 text-sm font-black text-sc-text"
        >
          <Share2 size={18} />
          שתף קבלה
        </button>
      </Card>
    </>
  );
}
