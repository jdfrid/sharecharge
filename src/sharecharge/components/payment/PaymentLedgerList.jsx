import { currency, shortTime } from '../../utils';
import { paymentStatusLabel, splitLabel } from '../../utils/paymentUtils';
import { Card } from '../ui/Card';

export function PaymentSummaryCards({ summary, portal }) {
  if (!summary) return null;

  if (portal === 'system') {
    return (
      <div className="grid grid-cols-2 gap-2">
        <SummaryTile label="עסקאות" value={summary.count} />
        <SummaryTile label="מחזור" value={currency(summary.volume || 0)} />
        <SummaryTile label="עמלות" value={currency(summary.platformFees || 0)} accent />
        <SummaryTile label="לספקים" value={currency(summary.hostPayouts || 0)} />
      </div>
    );
  }

  if (portal === 'provider') {
    return (
      <div className="grid grid-cols-2 gap-2">
        <SummaryTile label="תשלומים" value={summary.count} />
        <SummaryTile label="הכנסה" value={currency(summary.earned || 0)} accent />
        <SummaryTile label="הועבר" value={currency(summary.settled || 0)} />
        <SummaryTile label="ממתין" value={currency(summary.pendingPayouts || 0)} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <SummaryTile label="תשלומים" value={summary.count} />
      <SummaryTile label="סה״כ שולם" value={currency(summary.spent || 0)} accent />
    </div>
  );
}

function SummaryTile({ label, value, accent = false }) {
  return (
    <div className="rounded-[var(--sc-radius-md)] border border-sc-border bg-white p-3">
      <p className="text-[10px] font-bold text-sc-muted">{label}</p>
      <p className={`mt-1 text-lg font-black ${accent ? 'text-[var(--sc-accent)]' : 'text-sc-text'}`}>{value}</p>
    </div>
  );
}

export function PaymentLedgerList({ payments, detailLinkPrefix }) {
  if (!payments.length) {
    return (
      <Card>
        <p className="text-center text-sm font-bold text-sc-muted">אין תשלומים להצגה</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {payments.map((payment) => (
        <Card key={payment.id} className="!p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-black text-sc-text">{payment.title}</p>
              <p className="mt-1 text-xs font-bold text-sc-muted">
                {shortTime(payment.paidAt || payment.createdAt)} · {paymentStatusLabel(payment.status)}
              </p>
              {payment.gatewayTxnId ? (
                <p className="mt-1 text-[10px] font-bold text-sc-muted">Tranzila · {payment.gatewayTxnId}</p>
              ) : null}
            </div>
            <div className="text-left">
              <p className="text-lg font-black text-[var(--sc-accent)]">{currency(payment.amount)}</p>
              {detailLinkPrefix ? (
                <a href={`${detailLinkPrefix}/${payment.id}`} className="text-[10px] font-black text-[var(--sc-accent)]">
                  פירוט
                </a>
              ) : null}
            </div>
          </div>

          {payment.splits?.length ? (
            <div className="mt-3 space-y-1 border-t border-sc-border pt-3">
              {payment.splits.map((split) => (
                <div key={split.id} className="flex items-center justify-between text-xs">
                  <span className="font-bold text-sc-muted">{splitLabel(split)}</span>
                  <span className="font-black text-sc-text">
                    {currency(split.amount)} · {paymentStatusLabel(split.status)}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
