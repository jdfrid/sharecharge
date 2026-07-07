/**
 * Recommended payment gateways by region (Israel / USA).
 */
export function getPaymentGatewayRecommendations(region = 'IL') {
  const normalized = String(region || 'IL').toUpperCase();

  const israel = {
    region: 'IL',
    label: 'ישראל',
    currency: 'ILS',
    primary: {
      id: 'tranzila',
      name: 'Tranzila',
      description: 'סליקת אשראי מקומית · ILS · iframe / Direct',
      envKeys: ['TRANZILA_TERMINAL', 'TRANZILA_PW'],
      docsUrl: 'https://www.tranzila.com',
      supported: true,
    },
    alternatives: [
      {
        id: 'cardcom',
        name: 'Cardcom',
        description: 'סליקה ישראלית · חשבוניות מס',
        supported: false,
      },
      {
        id: 'payplus',
        name: 'PayPlus',
        description: 'תשלומים + Bit · API REST',
        supported: false,
      },
    ],
  };

  const usa = {
    region: 'US',
    label: 'ארה"ב',
    currency: 'USD',
    primary: {
      id: 'stripe',
      name: 'Stripe',
      description: 'Credit cards · Apple Pay · USD',
      envKeys: ['STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY'],
      docsUrl: 'https://stripe.com/docs',
      supported: false,
      note: 'מומלץ לשוק אמריקאי — ניתן לחבר בגרסה הבאה',
    },
    alternatives: [
      {
        id: 'square',
        name: 'Square',
        description: 'POS + online · USD',
        supported: false,
      },
      {
        id: 'paypal',
        name: 'PayPal / Braintree',
        description: 'כרטיס + PayPal wallet',
        supported: false,
      },
    ],
  };

  if (normalized === 'US' || normalized === 'USA') return usa;
  return israel;
}

export function detectPaymentRegion(req) {
  const header = req.headers['x-sharecharge-region'] || req.query?.region;
  if (header) return String(header).toUpperCase();
  const country = process.env.DEFAULT_PAYMENT_REGION;
  return country ? String(country).toUpperCase() : 'IL';
}
