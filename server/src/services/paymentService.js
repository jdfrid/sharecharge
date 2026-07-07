import { query } from '../db/pool.js';
import { createId } from '../utils.js';
import { chargeTranzila, tokenizeCard } from './tranzilaService.js';
import { getSettings } from './stateService.js';

export function buildDefaultSplits({ amount, platformFee, hostShare, cardSplits = [] }) {
  const chargeSplits =
    cardSplits.length > 0
      ? cardSplits
      : [{ cardLast4: '4242', cardBrand: 'visa', amount, token: 'default' }];

  const splits = chargeSplits.map((item) => ({
    splitType: 'card_charge',
    recipientId: null,
    cardLast4: item.cardLast4,
    cardBrand: item.cardBrand || 'visa',
    amount: Number(item.amount),
    token: item.token,
  }));

  if (platformFee > 0) {
    splits.push({
      splitType: 'platform',
      recipientId: 'platform',
      cardLast4: null,
      cardBrand: null,
      amount: platformFee,
    });
  }
  if (hostShare > 0) {
    splits.push({
      splitType: 'host_payout',
      recipientId: null,
      cardLast4: null,
      cardBrand: null,
      amount: hostShare,
    });
  }
  return splits;
}

export async function resolvePaymentContext(dbReady, referenceType, referenceId, payerId) {
  if (referenceType === 'booking') {
    if (!dbReady) return null;
    const { rows } = await query('SELECT * FROM bookings WHERE id = $1', [referenceId]);
    const booking = rows[0];
    if (!booking || booking.driver_id !== payerId) return null;
    const amount = Number(booking.amount || 0);
    const platformFee = Number(booking.platform_fee || 0);
    const hostShare = Number(booking.host_share || 0);
    return {
      title: 'תשלום עבור טעינה',
      amount: amount || Number((Number(booking.kwh) * 1.35).toFixed(2)),
      platformFee,
      hostShare,
      hostId: booking.host_id,
      status: booking.status,
    };
  }
  if (referenceType === 'tender') {
    if (!dbReady) return null;
    const { rows } = await query('SELECT * FROM service_requests WHERE id = $1', [referenceId]);
    const request = rows[0];
    if (!request || request.driver_id !== payerId) return null;
    const settings = await getSettings(dbReady);
    const amount = Number(request.amount || 0);
    const platformFee = Number((amount * settings.commission / 100).toFixed(2));
    const hostShare = Number((amount - platformFee).toFixed(2));
    return {
      title: 'תשלום עבור שירות חירום',
      amount,
      platformFee,
      hostShare,
      hostId: request.host_id,
      status: request.status,
    };
  }
  return null;
}

export async function insertPayment(dbReady, payload) {
  const id = createId('pay');
  const now = Date.now();
  if (!dbReady) return { id, ...payload, createdAt: now };

  await query(
    `INSERT INTO payments (id, reference_type, reference_id, payer_id, host_id, title, amount, platform_fee, host_share, currency, status, gateway, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [
      id,
      payload.referenceType,
      payload.referenceId,
      payload.payerId,
      payload.hostId,
      payload.title,
      payload.amount,
      payload.platformFee,
      payload.hostShare,
      payload.currency || 'ILS',
      payload.status || 'pending',
      payload.gateway || 'tranzila',
      now,
    ],
  );
  return { id, ...payload, createdAt: now };
}

export async function insertPaymentSplits(dbReady, paymentId, splits) {
  const now = Date.now();
  const rows = [];
  for (const split of splits) {
    const id = createId('split');
    rows.push({ id, paymentId, ...split, status: 'pending', createdAt: now });
    if (dbReady) {
      await query(
        `INSERT INTO payment_splits (id, payment_id, split_type, recipient_id, card_last4, card_brand, amount, status, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          id,
          paymentId,
          split.splitType,
          split.recipientId,
          split.cardLast4,
          split.cardBrand,
          split.amount,
          'pending',
          now,
        ],
      );
    }
  }
  return rows;
}

export async function executePaymentCharge(dbReady, payment, cardSplits, splits, cardPayload = {}) {
  const chargeSplits = splits.filter((s) => s.splitType === 'card_charge');
  const txnIds = [];

  for (let i = 0; i < chargeSplits.length; i += 1) {
    const split = chargeSplits[i];
    const card = cardSplits[i] || cardSplits[0] || {};
    const result = await chargeTranzila({
      amount: split.amount,
      cardToken: card.token,
      cardLast4: split.cardLast4 || card.cardLast4,
      cardNumber: i === 0 ? cardPayload.cardNumber : undefined,
      expiry: cardPayload.expiry,
      cvv: cardPayload.cvv,
      holder: cardPayload.holder,
      description: payment.title,
    });
    if (!result.ok) {
      return { ok: false, error: result.message || 'charge_failed' };
    }
    txnIds.push(result.txnId);
    if (dbReady) {
      await query(
        'UPDATE payment_splits SET status = $1, gateway_txn_id = $2 WHERE payment_id = $3 AND split_type = $4 AND card_last4 = $5',
        ['paid', result.txnId, payment.id, 'card_charge', split.cardLast4],
      );
    }
  }

  if (dbReady) {
    await query(
      `UPDATE payment_splits SET status = 'settled' WHERE payment_id = $1 AND split_type IN ('platform', 'host_payout')`,
      [payment.id],
    );
    await query(
      `UPDATE payments SET status = 'paid', gateway_txn_id = $1, paid_at = $2 WHERE id = $3`,
      [txnIds[0] || null, Date.now(), payment.id],
    );
  }

  return { ok: true, txnIds };
}

export { tokenizeCard };
