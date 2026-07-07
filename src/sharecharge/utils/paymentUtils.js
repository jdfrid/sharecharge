export function splitLabel(split) {
  if (split.splitType === 'card_charge') return `כרטיס ···${split.cardLast4}`;
  if (split.splitType === 'platform') return 'עמלת פלטפורמה';
  if (split.splitType === 'host_payout') return 'תשלום לספק';
  return split.splitType;
}

export function paymentStatusLabel(status) {
  const map = {
    pending: 'ממתין',
    paid: 'שולם',
    failed: 'נכשל',
    refunded: 'הוחזר',
  };
  return map[status] || status;
}

export function validateCardSplits(totalAmount, cardSplits) {
  const sum = cardSplits.reduce((acc, item) => acc + Number(item.amount || 0), 0);
  return Math.abs(sum - totalAmount) < 0.01;
}

export function defaultCardSplit(amount, cardLast4 = '4242', cardBrand = 'visa') {
  return [{ cardLast4, cardBrand, amount: Number(amount), token: 'default' }];
}

export function evenSplit(amount, cards) {
  if (!cards.length) return defaultCardSplit(amount);
  const each = Number((amount / cards.length).toFixed(2));
  const splits = cards.map((card, index) => ({
    cardLast4: card.cardLast4,
    cardBrand: card.cardBrand || 'visa',
    token: card.token,
    amount: index === cards.length - 1 ? Number((amount - each * (cards.length - 1)).toFixed(2)) : each,
  }));
  return splits;
}

export function maskCard(last4) {
  return `···· ${last4 || '0000'}`;
}

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
    splits.push({ splitType: 'platform', recipientId: 'platform', amount: platformFee, status: 'pending' });
  }
  if (hostShare > 0) {
    splits.push({ splitType: 'host_payout', recipientId: null, amount: hostShare, status: 'pending' });
  }
  return splits;
}
