import { Router } from 'express';
import { query } from '../db/pool.js';
import {
  createPaymentMem,
  executePaymentMem,
  listPaymentMethodsMem,
  listPaymentsMem,
  paymentSummaryMem,
  savePaymentMethodMem,
  markSplitPaidMem,
  updatePaymentSplitsMem,
} from '../devDataStore.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { addEvent } from '../services/stateService.js';
import {
  buildDefaultSplits,
  executePaymentCharge,
  insertPayment,
  insertPaymentSplits,
  resolvePaymentContext,
  tokenizeCard,
} from '../services/paymentService.js';
import {
  buildIframeSession,
  createHandshake,
  getTranzilaConfig,
  isTranzilaApproved,
  parseNotifyPayload,
} from '../services/tranzilaService.js';
import { detectPaymentRegion, getPaymentGatewayRecommendations } from '../services/paymentGateways.js';
import { createId, rowToPayment, rowToPaymentMethod, rowToPaymentSplit } from '../utils.js';

const router = Router();

function publicApiBase(req) {
  return (process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
}

function publicAppBase() {
  return (process.env.PUBLIC_APP_URL || 'https://localhost').replace(/\/$/, '');
}

async function markSplitPaid(dbReadyFlag, paymentId, splitIndex, txnId) {
  if (!dbReadyFlag) return;
  const { rows } = await query(
    `SELECT id FROM payment_splits WHERE payment_id = $1 AND split_type = 'card_charge' ORDER BY created_at ASC`,
    [paymentId],
  );
  const split = rows[splitIndex];
  if (!split) return;
  await query(`UPDATE payment_splits SET status = 'paid', gateway_txn_id = $1 WHERE id = $2`, [txnId, split.id]);

  const pending = await query(
    `SELECT COUNT(*)::int AS n FROM payment_splits WHERE payment_id = $1 AND split_type = 'card_charge' AND status != 'paid'`,
    [paymentId],
  );
  if (pending.rows[0].n === 0) {
    await query(`UPDATE payment_splits SET status = 'settled' WHERE payment_id = $1 AND split_type IN ('platform', 'host_payout')`, [
      paymentId,
    ]);
    await query(`UPDATE payments SET status = 'paid', gateway_txn_id = $1, paid_at = $2 WHERE id = $3`, [
      txnId,
      Date.now(),
      paymentId,
    ]);
  }
}

function dbReady(req) {
  return !!req.app.locals.dbReady;
}

async function loadPaymentWithSplits(dbReadyFlag, paymentId) {
  if (!dbReadyFlag) {
    const payments = listPaymentsMem();
    const payment = payments.find((p) => p.id === paymentId);
    if (!payment) return null;
    return payment;
  }
  const { rows } = await query('SELECT * FROM payments WHERE id = $1', [paymentId]);
  if (!rows[0]) return null;
  const payment = rowToPayment(rows[0]);
  const splitRes = await query('SELECT * FROM payment_splits WHERE payment_id = $1 ORDER BY created_at', [paymentId]);
  payment.splits = splitRes.rows.map(rowToPaymentSplit);
  return payment;
}

async function listPaymentsForUser(dbReadyFlag, user) {
  if (!dbReadyFlag) return listPaymentsMem(user);

  let sql = 'SELECT * FROM payments';
  const params = [];
  if (user.role === 'driver') {
    params.push(user.sub);
    sql += ' WHERE payer_id = $1';
  } else if (user.role === 'host') {
    params.push(user.sub);
    sql += ' WHERE host_id = $1';
  }
  sql += ' ORDER BY created_at DESC LIMIT 100';
  const { rows } = await query(sql, params);
  const payments = rows.map(rowToPayment);
  for (const payment of payments) {
    const splitRes = await query('SELECT * FROM payment_splits WHERE payment_id = $1', [payment.id]);
    payment.splits = splitRes.rows.map(rowToPaymentSplit);
  }
  return payments;
}

router.get('/gateways/recommendations', authRequired, (req, res) => {
  const region = detectPaymentRegion(req);
  res.json({ region, ...getPaymentGatewayRecommendations(region) });
});

router.get('/tranzila/config', authRequired, (_req, res) => {
  const config = getTranzilaConfig();
  res.json({
    config: {
      terminal: config.terminal,
      mock: config.mock,
      ready: config.ready,
      iframeBase: config.iframeBase,
      currency: config.currency,
    },
  });
});

router.post('/tranzila/handshake', authRequired, requireRole('driver'), async (req, res) => {
  try {
    const sum = Number(req.body?.sum || 0);
    const handshake = await createHandshake(sum);
    if (!handshake.ok) {
      return res.status(400).json({ error: handshake.error, detail: handshake.message });
    }
    res.json({ handshake });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'handshake_failed' });
  }
});

router.post('/:id/tranzila-session', authRequired, requireRole('driver'), async (req, res) => {
  try {
    const splitIndex = Number(req.body?.splitIndex || 0);
    const paymentId = req.params.id;
    const payment = await loadPaymentWithSplits(dbReady(req), paymentId);
    if (!payment || payment.payerId !== req.user.sub) {
      return res.status(404).json({ error: 'not_found', detail: 'תשלום לא נמצא' });
    }

    const chargeSplits = payment.splits.filter((s) => s.splitType === 'card_charge');
    const split = chargeSplits[splitIndex];
    if (!split) {
      return res.status(400).json({ error: 'invalid_split', detail: 'חלוקת כרטיס לא נמצאה' });
    }

    const handshake = await createHandshake(split.amount);
    if (!handshake.ok) {
      return res.status(400).json({ error: handshake.error, detail: handshake.message });
    }

    const apiBase = publicApiBase(req);
    const appBase = publicAppBase();
    const notifyUrl = `${apiBase}/api/sharecharge/payments/tranzila/notify?paymentId=${encodeURIComponent(paymentId)}&splitIndex=${splitIndex}`;
    const successUrl = `${apiBase}/api/sharecharge/payments/tranzila/return?status=success&paymentId=${encodeURIComponent(paymentId)}&splitIndex=${splitIndex}&app=${encodeURIComponent(appBase)}`;
    const failUrl = `${apiBase}/api/sharecharge/payments/tranzila/return?status=fail&paymentId=${encodeURIComponent(paymentId)}&splitIndex=${splitIndex}&app=${encodeURIComponent(appBase)}`;

    const session = buildIframeSession({
      sum: split.amount,
      thtk: handshake.thtk,
      supplier: handshake.supplier,
      notifyUrl,
      successUrl,
      failUrl,
      description: `${payment.title} · כרטיס ${splitIndex + 1}/${chargeSplits.length}`,
    });

    res.json({
      session: {
        ...session,
        paymentId,
        splitIndex,
        splitAmount: split.amount,
        mock: handshake.mock,
        totalSplits: chargeSplits.length,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'session_failed' });
  }
});

async function handleTranzilaNotify(req, res) {
  try {
    const paymentId = req.query.paymentId || req.body?.paymentId;
    const splitIndex = Number(req.query.splitIndex ?? req.body?.splitIndex ?? 0);
    const payload = parseNotifyPayload({ ...req.query, ...req.body });
    const approved = isTranzilaApproved(payload);
    const txnId = payload.index || payload.Index || payload.confirmation_code || payload.ConfirmationCode || createId('tx');

    if (approved && paymentId) {
      if (dbReady(req)) {
        await markSplitPaid(dbReady(req), paymentId, splitIndex, txnId);
      } else {
        markSplitPaidMem(paymentId, splitIndex, txnId);
      }
      await addEvent(`Tranzila אישר תשלום · ${paymentId}`, 'activity', dbReady(req));
    }

    res.json({ ok: approved, txnId, payload });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'notify_failed' });
  }
}

router.get('/tranzila/notify', handleTranzilaNotify);
router.post('/tranzila/notify', handleTranzilaNotify);

router.get('/tranzila/return', async (req, res) => {
  const status = req.query.status === 'success' ? 'success' : 'fail';
  const paymentId = req.query.paymentId || '';
  const splitIndex = req.query.splitIndex || '0';
  const appBase = req.query.app || publicAppBase();
  const target = `${appBase}/client/payment/return?status=${status}&paymentId=${encodeURIComponent(paymentId)}&splitIndex=${encodeURIComponent(splitIndex)}`;
  const message = status === 'success' ? 'התשלום אושר' : 'התשלום נכשל';

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${message}</title></head><body style="font-family:sans-serif;text-align:center;padding:2rem"><h1>${message}</h1><p>מחזירים לאפליקציה…</p><script>
    try { window.parent.postMessage({ type:'tranzila-return', status:'${status}', paymentId:'${paymentId}', splitIndex:'${splitIndex}' }, '*'); } catch(e) {}
    setTimeout(function(){ window.top.location.href = ${JSON.stringify(target)}; }, 600);
  </script></body></html>`);
});

router.get('/summary', authRequired, async (req, res) => {
  try {
    if (!dbReady(req)) {
      return res.json({ summary: paymentSummaryMem(req.user) });
    }
    const user = req.user;
    if (user.role === 'admin') {
      const { rows } = await query(
        `SELECT
          COUNT(*)::int AS count,
          COALESCE(SUM(amount), 0) AS volume,
          COALESCE(SUM(platform_fee), 0) AS platform_fees,
          COALESCE(SUM(host_share), 0) AS host_payouts
         FROM payments WHERE status = 'paid'`,
      );
      return res.json({
        summary: {
          count: rows[0].count,
          volume: Number(rows[0].volume),
          platformFees: Number(rows[0].platform_fees),
          hostPayouts: Number(rows[0].host_payouts),
          pendingPayouts: 0,
        },
      });
    }
    if (user.role === 'host') {
      const { rows } = await query(
        `SELECT COUNT(*)::int AS count, COALESCE(SUM(host_share), 0) AS earned,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN host_share ELSE 0 END), 0) AS settled
         FROM payments WHERE host_id = $1`,
        [user.sub],
      );
      return res.json({
        summary: {
          count: rows[0].count,
          earned: Number(rows[0].earned),
          settled: Number(rows[0].settled),
          pendingPayouts: Number(rows[0].earned) - Number(rows[0].settled),
        },
      });
    }
    const { rows } = await query(
      `SELECT COUNT(*)::int AS count, COALESCE(SUM(amount), 0) AS spent
       FROM payments WHERE payer_id = $1 AND status = 'paid'`,
      [user.sub],
    );
    return res.json({
      summary: {
        count: rows[0].count,
        spent: Number(rows[0].spent),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load payment summary' });
  }
});

router.get('/', authRequired, async (req, res) => {
  try {
    const payments = await listPaymentsForUser(dbReady(req), req.user);
    res.json({ payments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load payments' });
  }
});

router.get('/methods', authRequired, async (req, res) => {
  try {
    if (!dbReady(req)) {
      return res.json({ methods: listPaymentMethodsMem(req.user.sub) });
    }
    const { rows } = await query('SELECT * FROM payment_methods WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC', [
      req.user.sub,
    ]);
    res.json({ methods: rows.map(rowToPaymentMethod) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load payment methods' });
  }
});

router.post('/methods', authRequired, requireRole('driver'), async (req, res) => {
  try {
    const { number, expiry, cvv, holder, isDefault } = req.body || {};
    const tokenized = tokenizeCard({ number, expiry, cvv, holder });
    const id = createId('pm');
    const now = Date.now();

    if (!dbReady(req)) {
      const method = savePaymentMethodMem(req.user.sub, { id, ...tokenized, isDefault: !!isDefault, createdAt: now });
      return res.json({ method });
    }

    if (isDefault) {
      await query('UPDATE payment_methods SET is_default = false WHERE user_id = $1', [req.user.sub]);
    }
    await query(
      `INSERT INTO payment_methods (id, user_id, provider, token, card_last4, card_brand, is_default, created_at)
       VALUES ($1,$2,'tranzila',$3,$4,$5,$6,$7)`,
      [id, req.user.sub, tokenized.token, tokenized.cardLast4, tokenized.cardBrand, !!isDefault, now],
    );
    res.json({
      method: {
        id,
        userId: req.user.sub,
        provider: 'tranzila',
        token: tokenized.token,
        cardLast4: tokenized.cardLast4,
        cardBrand: tokenized.cardBrand,
        isDefault: !!isDefault,
        createdAt: now,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save payment method' });
  }
});

router.post('/checkout', authRequired, requireRole('driver'), async (req, res) => {
  try {
    const { referenceType, referenceId, amount, title, cardSplits, hostId, platformFee, hostShare } = req.body || {};
    if (!referenceType || !referenceId) {
      return res.status(400).json({ error: 'missing_reference', detail: 'חסרה הפניה לתשלום' });
    }

    let ctx = null;
    if (dbReady(req)) {
      ctx = await resolvePaymentContext(dbReady(req), referenceType, referenceId, req.user.sub);
    }

    const finalAmount = Number(amount || ctx?.amount || 0);
    const finalPlatformFee = Number(platformFee ?? ctx?.platformFee ?? 0);
    const finalHostShare = Number(hostShare ?? ctx?.hostShare ?? Math.max(0, finalAmount - finalPlatformFee));
    const finalTitle = title || ctx?.title || 'תשלום ShareCharge';
    const finalHostId = hostId || ctx?.hostId || null;

    if (finalAmount <= 0) {
      return res.status(400).json({ error: 'invalid_amount', detail: 'סכום התשלום חייב להיות גדול מאפס' });
    }

    const splits = buildDefaultSplits({
      amount: finalAmount,
      platformFee: finalPlatformFee,
      hostShare: finalHostShare,
      cardSplits: cardSplits || [],
    });

    if (!dbReady(req)) {
      const payment = createPaymentMem(req.user.sub, {
        referenceType,
        referenceId,
        title: finalTitle,
        amount: finalAmount,
        platformFee: finalPlatformFee,
        hostShare: finalHostShare,
        hostId: finalHostId,
        splits,
        cardSplits: cardSplits || [],
      });
      return res.json({ payment });
    }

    const payment = await insertPayment(dbReady(req), {
      referenceType,
      referenceId,
      payerId: req.user.sub,
      hostId: finalHostId,
      title: finalTitle,
      amount: finalAmount,
      platformFee: finalPlatformFee,
      hostShare: finalHostShare,
      status: 'pending',
    });
    payment.splits = await insertPaymentSplits(
      dbReady(req),
      payment.id,
      splits.map((s) => ({ ...s, recipientId: s.splitType === 'host_payout' ? finalHostId : s.recipientId })),
    );
    res.json({ payment: { ...payment, splits: payment.splits } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create checkout' });
  }
});

router.post('/:id/charge', authRequired, requireRole('driver'), async (req, res) => {
  try {
    const { cardSplits, cardNumber, expiry, cvv, holder } = req.body || {};
    const paymentId = req.params.id;

    if (!dbReady(req)) {
      const result = executePaymentMem(paymentId, req.user.sub, { cardSplits, cardNumber, expiry, cvv, holder });
      if (result.error) return res.status(result.status || 400).json({ error: result.error, detail: result.detail });
      await addEvent(`תשלום ${currencyLabel(result.payment.amount)} בוצע · Tranzila`, 'activity', dbReady(req));
      return res.json(result);
    }

    const payment = await loadPaymentWithSplits(dbReady(req), paymentId);
    if (!payment || payment.payerId !== req.user.sub) {
      return res.status(404).json({ error: 'not_found', detail: 'תשלום לא נמצא' });
    }
    if (payment.status === 'paid') {
      return res.json({ ok: true, payment });
    }

    let cards = cardSplits || [];
    if (!cards.length && cardNumber) {
      const tokenized = tokenizeCard({ number: cardNumber, expiry, cvv, holder });
      cards = [{ ...tokenized, amount: payment.amount }];
    }

    const chargeResult = await executePaymentCharge(dbReady(req), payment, cards, payment.splits, {
      cardNumber,
      expiry,
      cvv,
      holder,
    });
    if (!chargeResult.ok) {
      await query('UPDATE payments SET status = $1 WHERE id = $2', ['failed', paymentId]);
      return res.status(402).json({ error: 'charge_failed', detail: chargeResult.error || 'החיוב נכשל' });
    }

    await addEvent(`תשלום ₪${payment.amount} בוצע · Tranzila`, 'activity', dbReady(req));
    const updated = await loadPaymentWithSplits(dbReady(req), paymentId);
    res.json({ ok: true, payment: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to charge payment' });
  }
});

router.patch('/:id/splits', authRequired, requireRole('driver'), async (req, res) => {
  try {
    const { cardSplits } = req.body || {};
    if (!Array.isArray(cardSplits) || !cardSplits.length) {
      return res.status(400).json({ error: 'invalid_splits', detail: 'יש להגדיר לפחות כרטיס אחד' });
    }

    if (!dbReady(req)) {
      const payment = updatePaymentSplitsMem(req.params.id, req.user.sub, cardSplits);
      if (!payment) return res.status(400).json({ error: 'split_mismatch', detail: 'חלוקה לא תקינה' });
      return res.json({ payment });
    }

    const payment = await loadPaymentWithSplits(dbReady(req), req.params.id);
    if (!payment || payment.payerId !== req.user.sub) {
      return res.status(404).json({ error: 'not_found' });
    }

    const total = cardSplits.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    if (Math.abs(total - payment.amount) > 0.01) {
      return res.status(400).json({
        error: 'split_mismatch',
        detail: `סכום החלוקה (${total}) חייב להיות שווה ל-${payment.amount}`,
      });
    }

    await query('DELETE FROM payment_splits WHERE payment_id = $1 AND split_type = $2', [payment.id, 'card_charge']);
    const chargeSplits = cardSplits.map((item) => ({
      splitType: 'card_charge',
      recipientId: null,
      cardLast4: item.cardLast4,
      cardBrand: item.cardBrand || 'visa',
      amount: Number(item.amount),
    }));
    const platformSplit = payment.splits.find((s) => s.splitType === 'platform');
    const hostSplit = payment.splits.find((s) => s.splitType === 'host_payout');
    if (platformSplit) chargeSplits.push({ ...platformSplit, splitType: 'platform' });
    if (hostSplit) chargeSplits.push({ ...hostSplit, splitType: 'host_payout' });

    payment.splits = await insertPaymentSplits(dbReady(req), payment.id, chargeSplits);
    res.json({ payment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update splits' });
  }
});

function currencyLabel(amount) {
  return `₪${Number(amount).toFixed(2)}`;
}

export default router;
