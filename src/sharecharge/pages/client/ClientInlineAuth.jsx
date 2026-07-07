import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { roleEntryConfig, SHARECHARGE_ROLE_KEYS } from '../../constants';
import { getPreferredRepositoryMode } from '../../data/apiRepository.stub';
import {
  checkApiHealth,
  formatShareChargeApiError,
  sendOtp,
  verifyOtp,
} from '../../data/sharechargeApi';
import { createOtp, shortTime } from '../../utils';
import { clearAuthSession, isPortalSessionReady, setAuthSession } from '../../auth/session';
import { clearPendingIntent, loadPendingIntent } from '../../utils/pendingIntent';
import { resumePendingIntent } from '../../utils/resumePendingIntent';
import { useShareCharge } from '../../context/ShareChargeContext';

const portal = SHARECHARGE_ROLE_KEYS.client;

function isOtpCode(value) {
  return /^\d{4}$/.test(String(value || '').trim());
}

export function ClientInlineAuth() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const ctx = useShareCharge();
  const config = roleEntryConfig.client;
  const apiMode = getPreferredRepositoryMode() === 'api';

  const [email, setEmail] = useState(config.email);
  const [sentOtp, setSentOtp] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [gpsConsent, setGpsConsent] = useState(true);
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const [sentAt, setSentAt] = useState(null);
  const [busy, setBusy] = useState(false);

  const returnTo = params.get('return') || loadPendingIntent()?.returnTo || '/client/home';
  const visibleCode = isOtpCode(sentOtp) ? sentOtp : isOtpCode(otpInput) ? otpInput : '';

  useEffect(() => {
    if (isPortalSessionReady(portal)) {
      resumePendingIntent(navigate, ctx, returnTo);
    }
  }, [navigate, ctx, returnTo]);

  const finishAuth = useCallback(async () => {
    await resumePendingIntent(navigate, ctx, returnTo);
  }, [navigate, ctx, returnTo]);

  const completeVerify = async (codeOverride) => {
    const code = String(codeOverride ?? otpInput).trim();
    if (!gpsConsent) {
      setAuthError('יש לאשר שיתוף מיקום GPS');
      return false;
    }
    if (!code) {
      setAuthError('יש להזין את קוד האימות');
      return false;
    }

    setAuthError('');
    try {
      if (apiMode) {
        const data = await verifyOtp(email, portal, code);
        setAuthSession(portal, {
          verified: true,
          email: data.user?.email || email,
          verifiedAt: Date.now(),
          token: data.token,
        });
      } else {
        if (code !== sentOtp) {
          setAuthError('קוד שגוי');
          return false;
        }
        setAuthSession(portal, {
          verified: true,
          email,
          verifiedAt: Date.now(),
          offlineDemo: true,
        });
      }
      clearPendingIntent();
      await finishAuth();
      return true;
    } catch (err) {
      setAuthError(formatShareChargeApiError(err, 'verify'));
      return false;
    }
  };

  const sendEmailOtp = async () => {
    if (!email.includes('@')) {
      setAuthError('יש להזין כתובת מייל תקינה');
      return;
    }
    setBusy(true);
    setAuthError('');
    try {
      if (apiMode) {
        const health = await checkApiHealth({ retries: 2, delayMs: 8000 });
        if (!health.ok) {
          setAuthError(health.message || 'השרver לא זמין');
          return;
        }
        const data = await sendOtp(email, portal);
        const code = data.devCode || '';
        setSentOtp(code || 'sent');
        setOtpInput(code);
        setSentAt(Date.now());
        if (isOtpCode(code)) {
          await completeVerify(code);
          return;
        }
        setAuthNotice('הקוד נשלח — הזינו ולחצו המשך');
        return;
      }
      const code = createOtp();
      setSentOtp(code);
      setOtpInput(code);
      setSentAt(Date.now());
      setAuthNotice('קוד demo מקומי');
    } catch (err) {
      setAuthError(formatShareChargeApiError(err, 'otp'));
    } finally {
      setBusy(false);
    }
  };

  const verifyEmailOtp = async () => {
    setBusy(true);
    try {
      await completeVerify();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div dir="rtl" className="sc-skin min-h-screen bg-[var(--sc-bg)] px-4 py-8 text-sc-text">
      <div className="mx-auto max-w-md">
        <Link
          to={returnTo}
          className="inline-flex items-center gap-1 rounded-full border border-sc-border bg-white px-3 py-2 text-sm font-black text-[var(--sc-accent)]"
        >
          <ChevronLeft size={18} />
          חזרה
        </Link>

        <div className="mt-6 rounded-sc-lg border border-sc-border bg-white p-5 shadow-sc-card">
          <h1 className="text-2xl font-black">כמעט שם!</h1>
          <p className="mt-2 text-sm font-bold text-sc-muted">אימות מייל + OTP לפני המשך הפעולה</p>

          <label className="mt-4 block text-xs font-bold text-sc-muted">
            מייל
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="sc-field text-right text-sm"
              dir="ltr"
              disabled={busy}
            />
          </label>

          <button type="button" onClick={sendEmailOtp} disabled={busy} className="sc-btn-primary mt-3 !text-sm">
            {busy ? 'שולח…' : 'שלח קוד OTP'}
          </button>

          {visibleCode ? (
            <p className="mt-3 font-mono text-2xl font-black tracking-[0.2em] text-[var(--sc-accent)]">{visibleCode}</p>
          ) : null}

          <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
            <input
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="OTP"
              className="sc-field mt-0 text-center font-mono text-xl"
              maxLength={4}
              dir="ltr"
            />
            <button
              type="button"
              onClick={verifyEmailOtp}
              disabled={busy}
              className="rounded-sc-md bg-slate-900 px-5 py-3 text-sm font-black text-white"
            >
              המשך
            </button>
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm font-bold text-sc-text">
            <input type="checkbox" checked={gpsConsent} onChange={(e) => setGpsConsent(e.target.checked)} />
            מאשר/ת שיתוף מיקום GPS
          </label>

          {authNotice ? <p className="mt-2 text-sm font-bold text-[var(--sc-accent-2)]">{authNotice}</p> : null}
          {authError ? <p className="mt-2 text-sm font-bold text-red-600">{authError}</p> : null}
          {sentAt ? <p className="mt-1 text-[10px] text-sc-muted">{shortTime(sentAt)}</p> : null}

          {isPortalSessionReady(portal) ? (
            <button
              type="button"
              className="mt-4 text-xs font-bold text-sc-muted underline"
              onClick={() => {
                clearAuthSession(portal);
                window.location.reload();
              }}
            >
              ניקוי סשן
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
