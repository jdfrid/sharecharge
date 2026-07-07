import { createId } from '../utils.js';

const IFRAME_BASE = process.env.TRANZILA_IFRAME_BASE || 'https://directng.tranzila.com';
const CGI_BASE = process.env.TRANZILA_CGI_BASE || 'https://secure5.tranzila.com/cgi-bin';
const HANDSHAKE_URL = process.env.TRANZILA_HANDSHAKE_URL || 'https://api.tranzila.com/v1/handshake/create';

export function getTranzilaConfig() {
  const terminal = process.env.TRANZILA_TERMINAL || '';
  const password = process.env.TRANZILA_PW || process.env.TRANZILA_PASSWORD || '';
  const mock = process.env.TRANZILA_MOCK === 'true' || (!terminal || !password);
  return {
    terminal,
    mock,
    iframeBase: IFRAME_BASE,
    currency: Number(process.env.TRANZILA_CURRENCY || 1),
    ready: !mock,
  };
}

function parseTranzilaBody(text) {
  const raw = String(text || '').trim();
  const params = {};
  if (!raw) return params;
  if (raw.startsWith('{')) {
    try {
      return JSON.parse(raw);
    } catch {
      /* fall through */
    }
  }
  for (const part of raw.split('&')) {
    const [key, ...rest] = part.split('=');
    if (!key) continue;
    params[decodeURIComponent(key)] = decodeURIComponent(rest.join('=') || '');
  }
  return params;
}

export function isTranzilaApproved(payload) {
  const code = String(payload.Response ?? payload.response ?? payload.error_code ?? '').trim();
  return code === '000' || code === '0';
}

export async function createHandshake(sum) {
  const { terminal, password, mock } = getTranzilaConfig();
  const amount = Number(sum);
  if (!amount || amount <= 0) {
    return { ok: false, error: 'invalid_amount', message: 'סכום לא תקין' };
  }

  if (mock) {
    return {
      ok: true,
      thtk: `mock-thtk-${createId('hs')}`,
      supplier: terminal || 'mock-terminal',
      sum: amount,
      mock: true,
    };
  }

  const url = `${HANDSHAKE_URL}?supplier=${encodeURIComponent(terminal)}&sum=${encodeURIComponent(amount)}&TranzilaPW=${encodeURIComponent(password)}`;
  const res = await fetch(url, { method: 'GET' });
  const text = await res.text();
  if (!res.ok) {
    return { ok: false, error: 'handshake_failed', message: text || 'Handshake נכשל' };
  }

  let thtk = text.trim();
  if (thtk.startsWith('thtk=')) thtk = thtk.slice(5);
  if (!thtk) {
    return { ok: false, error: 'handshake_empty', message: 'Tranzila לא החזיר thtk — בדקו terminal וסיסמה' };
  }

  return { ok: true, thtk, supplier: terminal, sum: amount, mock: false };
}

export function buildIframeSession({
  sum,
  thtk,
  supplier,
  notifyUrl,
  successUrl,
  failUrl,
  description = 'ShareCharge',
}) {
  const { currency, mock } = getTranzilaConfig();
  const terminal = supplier || process.env.TRANZILA_TERMINAL;
  const iframeUrl = `${IFRAME_BASE}/${encodeURIComponent(terminal)}/iframenew.php`;
  const fields = {
    sum: Number(sum).toFixed(2),
    currency: String(currency),
    cred_type: '1',
    tranmode: 'AK',
    new_process: '1',
    thtk,
    pdesc: description,
    notify_url_address: notifyUrl,
    success_url_address: successUrl,
    fail_url_address: failUrl,
  };
  return { iframeUrl, fields, mock, supplier: terminal };
}

async function postTranzilaCgi(path, fields) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) {
    if (value != null && value !== '') body.set(key, String(value));
  }
  const res = await fetch(`${CGI_BASE}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const text = await res.text();
  const data = parseTranzilaBody(text);
  return { ok: isTranzilaApproved(data), data, raw: text };
}

function normalizeExpiry(expiry) {
  const digits = String(expiry || '').replace(/\D/g, '');
  if (digits.length === 4) return digits;
  if (digits.length === 6) return digits.slice(0, 4);
  const [mm, yy] = String(expiry || '').split('/');
  if (mm && yy) return `${mm.padStart(2, '0')}${yy.slice(-2)}`;
  return digits.slice(0, 4);
}

export async function chargeDirectCard({ amount, cardNumber, expiry, cvv, holder, description }) {
  const { terminal, password, mock, currency } = getTranzilaConfig();
  const sum = Number(amount);
  if (!sum || sum <= 0) {
    return { ok: false, error: 'invalid_amount', message: 'סכום לא תקין' };
  }

  if (mock) {
    await new Promise((r) => setTimeout(r, 700));
    const last4 = String(cardNumber || '').slice(-4) || '4242';
    return {
      ok: true,
      txnId: `tz-mock-${createId('tx')}`,
      authCode: String(Math.floor(100000 + Math.random() * 900000)),
      cardLast4: last4,
      provider: 'tranzila-mock',
      amount: sum,
      currency: 'ILS',
    };
  }

  const result = await postTranzilaCgi('tranzila31.cgi', {
    supplier: terminal,
    TranzilaPW: password,
    sum: sum.toFixed(2),
    currency,
    ccno: String(cardNumber || '').replace(/\s/g, ''),
    expdate: normalizeExpiry(expiry),
    mycvv: cvv,
    contact: holder || '',
    pdesc: description || 'ShareCharge',
    tranmode: 'AK',
    cred_type: '1',
  });

  if (!result.ok) {
    const message = result.data?.ResponseText || result.data?.error || result.raw || 'החיוב נכשל';
    return { ok: false, error: 'charge_failed', message };
  }

  return {
    ok: true,
    txnId: result.data.index || result.data.Index || createId('tx'),
    authCode: result.data.ConfirmationCode || result.data.confirmation_code,
    cardLast4: String(cardNumber || '').slice(-4),
    provider: 'tranzila',
    amount: sum,
    currency: 'ILS',
    raw: result.data,
  };
}

export async function chargeWithToken({ amount, token, expiry, description }) {
  const { terminal, password, mock, currency } = getTranzilaConfig();
  const sum = Number(amount);
  if (mock) {
    return chargeDirectCard({ amount: sum, cardNumber: '4580000000004242', expiry, cvv: '123', holder: '', description });
  }

  const result = await postTranzilaCgi('tranzila31tk.cgi', {
    supplier: terminal,
    TranzilaPW: password,
    sum: sum.toFixed(2),
    currency,
    TranzilaTK: token,
    expdate: normalizeExpiry(expiry),
    tranmode: 'AK',
    cred_type: '1',
    pdesc: description || 'ShareCharge',
  });

  if (!result.ok) {
    return { ok: false, error: 'charge_failed', message: result.data?.ResponseText || 'החיוב ב-token נכשל' };
  }

  return {
    ok: true,
    txnId: result.data.index || createId('tx'),
    authCode: result.data.ConfirmationCode,
    cardLast4: result.data.token ? String(result.data.token).slice(-4) : '0000',
    provider: 'tranzila',
    amount: sum,
    currency: 'ILS',
  };
}

export async function chargeTranzila({ amount, cardNumber, expiry, cvv, holder, cardToken, cardLast4, description }) {
  if (cardToken && cardToken !== 'default' && !String(cardToken).startsWith('mock')) {
    return chargeWithToken({ amount, token: cardToken, expiry, description });
  }
  if (cardNumber) {
    return chargeDirectCard({ amount, cardNumber, expiry, cvv, holder, description });
  }
  return chargeDirectCard({
    amount,
    cardNumber: `458000000000${cardLast4 || '4242'}`,
    expiry: expiry || '12/28',
    cvv: cvv || '123',
    holder,
    description,
  });
}

export function tokenizeCard({ number, expiry, cvv, holder }) {
  const last4 = String(number || '').slice(-4) || '4242';
  const brand = String(number || '').startsWith('5') ? 'mastercard' : 'visa';
  return {
    token: `tz-tok-${createId('card')}`,
    cardLast4: last4,
    cardBrand: brand,
    holder: holder || '',
    expiry,
    cvvProvided: !!cvv,
  };
}

export function parseNotifyPayload(query) {
  return parseTranzilaBody(
    Object.entries(query || {})
      .map(([k, v]) => `${k}=${v}`)
      .join('&'),
  );
}
