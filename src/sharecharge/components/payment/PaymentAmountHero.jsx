import { currency } from '../../utils';

export function PaymentAmountHero({ amount, title, subtitle, status }) {
  return (
    <section className="sc-payment-hero text-center">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-white/75">{title || 'סכום לתשלום'}</p>
      <p className="mt-3 text-5xl font-black leading-none text-white">{currency(amount)}</p>
      {subtitle ? <p className="mt-3 text-sm font-bold text-white/80">{subtitle}</p> : null}
      {status ? (
        <span className="mt-4 inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-black text-white">
          {status}
        </span>
      ) : null}
    </section>
  );
}
