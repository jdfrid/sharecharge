import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { roleEntryConfig, SHARECHARGE_ROLE_KEYS } from '../constants';
import { getPreferredRepositoryMode } from '../data/apiRepository.stub';
import {
  checkApiHealth,
  formatShareChargeApiError,
  getApiOrigin,
  registerAccount,
  sendOtp,
  verifyOtp,
} from '../data/sharechargeApi';
import { createOtp, shortTime } from '../utils';
import {
  clearAuthSession,
  getAuthSessionEmail,
  isPortalSessionReady,
  sanitizePortalSession,
  setAuthSession,
} from '../auth/session';
import { isSingleAppBuild, flavorLabel, getShareChargeApp } from '../config/appConfig';

function portalHomePath(portal) {
  if (portal === SHARECHARGE_ROLE_KEYS.system) {
    const opsApp = getShareChargeApp() === 'ops' && isSingleAppBuild();
    return opsApp ? '/ops/dashboard' : '/ops/console';
  }
  if (portal === SHARECHARGE_ROLE_KEYS.client) return '/client/home';
  if (portal === SHARECHARGE_ROLE_KEYS.provider) return '/provider/dashboard';
  return '/sharecharge';
}


function isOtpCode(value) {
  return /^\d{4}$/.test(String(value || '').trim());
}

export function ShareChargeRoleEntry({ portal }) {
  const navigate = useNavigate();
  const config = roleEntryConfig[portal] || roleEntryConfig.client;
  const Icon = config.icon;
  const apiMode = getPreferredRepositoryMode() === 'api';
  const apiOrigin = getApiOrigin();

  const [email, setEmail] = useState(() => getAuthSessionEmail(portal) || config.email);
  const [sessionReady, setSessionReady] = useState(() => isPortalSessionReady(portal));
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [serviceCategory, setServiceCategory] = useState('fuel');
  const [stationAddress, setStationAddress] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState('');
  const [devCode, setDevCode] = useState('');
  const [sentOtp, setSentOtp] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const [sentAt, setSentAt] = useState(null);
  const [busy, setBusy] = useState(false);
  const [serverOk, setServerOk] = useState(apiMode ? null : true);
  const [serverMessage, setServerMessage] = useState('');
  const visibleCode = devCode || (isOtpCode(otpInput) ? otpInput : '');

  const probeServer = useCallback(async () => {
    if (!apiMode) {
      setServerOk(true);
      return true;
    }
    setServerOk(null);
    setServerMessage('מתעורר/בודק חיבור לשרver… (עד ~45 שניות ב-Free tier)');
    const health = await checkApiHealth();
    setServerOk(health.ok);
    setServerMessage(
      health.ok
        ? health.dbWarning
          ? `מחובר — OTP זמני (מסד נתונים: ${health.dbWarning})`
          : 'מחובר לשרver Render'
        : health.message,
    );
    return health.ok;
  }, [apiMode]);

  const startLocalOtp = (notice) => {
    const code = createOtp();
    setSentOtp(code);
    setOtpInput(code);
    setDevCode(code);
    setSentAt(Date.now());
    setAuthNotice(notice || 'מצב דemo מקומי — הקוד מוצג למטה.');
    setAuthError('');
    return code;
  };

  const completeVerify = async (codeOverride) => {
    const code = String(codeOverride ?? otpInput).trim();
    if (apiMode && !sentOtp) {
      setAuthError('קודם יש לשלוח קוד OTP');
      return false;
    }
    if (!apiMode && !sentOtp) {
      setAuthError('קודם יש לשלוח קוד למייל');
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
          setAuthError('קוד שגוי. נסה שוב או שלח קוד חדש');
          return false;
        }
        setAuthSession(portal, {
          verified: true,
          email,
          verifiedAt: Date.now(),
          offlineDemo: true,
        });
      }
      navigate(portalHomePath(portal), { replace: true });
      return true;
    } catch (err) {
      setAuthError(formatShareChargeApiError(err, 'verify'));
      return false;
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

  const sendEmailOtp = async () => {
    if (!email.includes('@')) {
      setAuthError('יש להזין כתובת מייל תקינה');
      return;
    }
    if (isSignup && !name.trim()) {
      setAuthError('יש להזין שם מלא');
      return;
    }
    setBusy(true);
    setAuthError('');
    setAuthNotice('');
    setDevCode('');
    try {
      if (apiMode) {
        const reachable = serverOk === true ? true : await probeServer();
        if (!reachable) {
          setAuthError(serverMessage || 'השרver לא זמין — לא עוברים למצב דemo.');
          return;
        }
        const data = isSignup
          ? await registerAccount({
              email,
              portal,
              name: name.trim(),
              phone: phone.trim(),
              businessName: businessName.trim(),
              serviceCategory: portal === SHARECHARGE_ROLE_KEYS.provider ? serviceCategory : undefined,
              stationAddress: portal === SHARECHARGE_ROLE_KEYS.provider ? stationAddress.trim() : undefined,
            })
          : await sendOtp(email, portal);
        const code = data.devCode || '';
        setSentOtp(code || 'sent');
        setOtpInput(code);
        setDevCode(code);
        setDeliveryMethod(data.deliveryMethod || '');
        setSentAt(Date.now());
        if (isOtpCode(code)) {
          setAuthNotice('קוד מהשרver — מאמתים אוטומטית…');
          const ok = await completeVerify(code);
          if (ok) return;
          setAuthNotice('הקוד התקבל — לחצו «אימות» אם לא נכנסתם אוטומטית.');
          return;
        }
        setAuthNotice(
          data.deliveryMethod === 'email'
            ? 'קוד נשלח למייל — הזינו אותו ולחצו «אימות».'
            : 'הקוד נוצר — הזינו אותו ולחצו «אימות» (SMTP לא מוגדר בשרver).',
        );
        return;
      }
      startLocalOtp('קוד דemo מקומי — לחצו «אימות» עם הקוד למטה.');
    } catch (err) {
      setAuthError(formatShareChargeApiError(err, 'otp'));
    } finally {
      setBusy(false);
    }
  };

  const resetLoginForm = useCallback(() => {
    setSentOtp('');
    setOtpInput('');
    setDevCode('');
    setAuthError('');
    setAuthNotice('');
    setSentAt(null);
    setDeliveryMethod('');
  }, []);

  const refreshSessionState = useCallback(() => {
    sanitizePortalSession(portal);
    setSessionReady(isPortalSessionReady(portal));
  }, [portal]);

  useEffect(() => {
    refreshSessionState();
  }, [refreshSessionState]);

  const handleSwitchAccount = () => {
    clearAuthSession(portal);
    setSessionReady(false);
    setEmail('');
    resetLoginForm();
  };

  const handleContinueSession = () => {
    navigate(portalHomePath(portal), { replace: true });
  };

  useEffect(() => {
    if (apiMode) probeServer();
  }, [apiMode, probeServer]);

  return (
    <div dir="rtl" className="sc-skin sc-no-motion min-h-screen bg-[var(--sc-bg)] text-sc-text">
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col overflow-hidden px-4 py-[calc(1rem+env(safe-area-inset-top,0px))] pb-8">
        <div className="pointer-events-none absolute -right-24 top-8 h-56 w-56 rounded-full bg-[var(--sc-accent)]/8 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-32 h-64 w-64 rounded-full bg-[var(--sc-accent-2)]/8 blur-3xl" />

        <div className="relative z-10 flex items-center justify-between">
          {!isSingleAppBuild() ? (
            <Link
              to="/sharecharge"
              className="sc-btn-outline rounded-sc-sm !px-4 !py-2 text-sm !font-black text-[var(--sc-accent)] shadow-sm"
            >
              ← בחירת אפליקציה
            </Link>
          ) : (
            <span />
          )}
          <span className="rounded-full border border-sc-border bg-white px-3 py-1 text-xs font-black text-[var(--sc-accent-2)] shadow-sm">
            אפליקציית {flavorLabel()}
          </span>
        </div>

        <section className="relative z-10 my-6 rounded-sc-lg border border-sc-border bg-white p-5 shadow-sc-card">
          <div className="relative mx-auto mb-6 flex h-44 w-full items-center justify-center overflow-hidden rounded-sc-md border border-sc-border bg-gradient-to-br from-[var(--sc-surface)] to-white">
            <img src="./sharecharge-logo.png" alt="" className="h-full w-full object-cover opacity-95" />
            <div className="absolute inset-x-4 bottom-3 rounded-sc-sm border border-sc-border bg-white px-4 py-3 shadow-sm">
              <p className="text-sm font-black text-sc-text">{config.title}</p>
              <p className="text-xs font-bold text-sc-muted">הזדהות במייל · OTP</p>
            </div>
          </div>

          <div className="text-center">
            <div
              className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-sc-md bg-gradient-to-br ${config.gradient} text-white shadow-sc-card`}
            >
              <Icon size={28} />
            </div>
            <h1 className="text-3xl font-black tracking-tight">{config.title}</h1>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-7 text-sc-muted">{config.subtitle}</p>
          </div>
        </section>

        <div className="relative z-10 space-y-3">
          {sessionReady ? (
            <div className="rounded-sc-lg border border-emerald-200 bg-emerald-50 p-4 shadow-sc-card">
              <p className="text-sm font-black text-emerald-900">כבר מחוברים</p>
              <p className="mt-1 text-xs font-bold text-emerald-800">
                חשבון פעיל: <span dir="ltr">{getAuthSessionEmail(portal) || email}</span>
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={handleContinueSession} className="sc-btn-primary flex-1 !text-sm">
                  המשך ל{portal === SHARECHARGE_ROLE_KEYS.provider ? 'לוח הספק' : 'אפליקציה'}
                </button>
                <button
                  type="button"
                  onClick={handleSwitchAccount}
                  className="sc-btn-outline flex-1 !text-sm !font-black"
                >
                  החלפת חשבון
                </button>
              </div>
            </div>
          ) : null}

          {apiMode && apiOrigin ? (
            <div
              className={`rounded-sc-sm border px-3 py-2 text-[11px] font-bold leading-6 ${
                serverOk === true
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : serverOk === false
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : 'border-amber-200 bg-amber-50 text-amber-800'
              }`}
            >
              <p>
                שרת API: <span dir="ltr">{apiOrigin}</span>
              </p>
              <p className="mt-1">{serverMessage || 'בודק…'}</p>
              {serverOk === false ? (
                <button
                  type="button"
                  onClick={() => probeServer()}
                  disabled={busy || serverOk === null}
                  className="mt-2 rounded-sc-sm bg-white px-3 py-1 text-xs font-black text-red-700 shadow-sm disabled:opacity-60"
                >
                  נסה שוב
                </button>
              ) : null}
            </div>
          ) : null}

          {!sessionReady ? (
          <div className="rounded-sc-lg border border-sc-border bg-white p-4 shadow-sc-card">
            <div className="mb-3 flex gap-2">
              <button
                type="button"
                onClick={() => setIsSignup(false)}
                className={`flex-1 rounded-sc-sm py-2 text-xs font-black ${!isSignup ? 'bg-[var(--sc-accent)] text-white' : 'border border-sc-border bg-white'}`}
              >
                התחברות
              </button>
              <button
                type="button"
                onClick={() => setIsSignup(true)}
                className={`flex-1 rounded-sc-sm py-2 text-xs font-black ${isSignup ? 'bg-[var(--sc-accent)] text-white' : 'border border-sc-border bg-white'}`}
              >
                הרשמה חדשה
              </button>
            </div>
            <p className="mb-3 text-sm font-black text-[var(--sc-accent)]">
              {isSignup ? 'יצירת משתמש / ספק' : 'קוד אימות'}
            </p>

            {isSignup ? (
              <>
                <label className="text-xs font-bold text-sc-muted">
                  שם מלא
                  <input value={name} onChange={(e) => setName(e.target.value)} className="sc-field text-sm" disabled={busy} />
                </label>
                <label className="mt-2 block text-xs font-bold text-sc-muted">
                  טלפון
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} className="sc-field text-sm" dir="ltr" disabled={busy} />
                </label>
                {portal === SHARECHARGE_ROLE_KEYS.provider ? (
                  <>
                    <label className="mt-2 block text-xs font-bold text-sc-muted">
                      שם העסק
                      <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="sc-field text-sm" disabled={busy} />
                    </label>
                    <label className="mt-2 block text-xs font-bold text-sc-muted">
                      סוג שירות
                      <select value={serviceCategory} onChange={(e) => setServiceCategory(e.target.value)} className="sc-field text-sm">
                        <option value="fuel">דלק</option>
                        <option value="puncture">פנצ&apos;ר</option>
                        <option value="tow">גרר</option>
                        <option value="garage">מוסך / מצבר</option>
                      </select>
                    </label>
                    <label className="mt-2 block text-xs font-bold text-sc-muted">
                      כתובת נקודת שירות
                      <input value={stationAddress} onChange={(e) => setStationAddress(e.target.value)} className="sc-field text-sm" disabled={busy} />
                    </label>
                  </>
                ) : null}
              </>
            ) : null}
            <label className="mt-2 block text-xs font-bold text-sc-muted">
              כתובת מייל
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="sc-field text-right text-sm"
                inputMode="email"
                dir="ltr"
                disabled={busy}
              />
            </label>
            <button
              type="button"
              onClick={sendEmailOtp}
              disabled={busy || (apiMode && serverOk === false)}
              className="sc-btn-primary mt-3 !text-sm disabled:opacity-60"
            >
              {busy ? 'שולח…' : isSignup ? 'הרשמה + שליחת קוד' : 'שלח קוד OTP'}
            </button>

            {visibleCode && deliveryMethod !== 'email' ? (
              <div className="mt-3 rounded-sc-sm border border-sc-border bg-sc-surface p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-sc-muted">קוד לכניסה</p>
                    <p className="truncate text-sm font-black">{email}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[var(--sc-accent)] px-3 py-1 text-xs font-black text-white">
                    {sentAt ? shortTime(sentAt) : ''}
                  </span>
                </div>
                <p className="mt-2 text-xs text-sc-muted">{apiMode ? 'קוד מהשרver:' : 'קוד דemo:'}</p>
                <p className="mt-1 font-mono text-3xl font-black tracking-[0.28em] text-[var(--sc-accent)]">{visibleCode}</p>
              </div>
            ) : null}

            <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
              <input
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="קוד"
                className="sc-field mt-0 text-center font-mono text-xl tracking-[0.2em]"
                inputMode="numeric"
                maxLength={4}
                dir="ltr"
                disabled={busy}
              />
              <button
                type="button"
                onClick={verifyEmailOtp}
                disabled={busy}
                className="self-center rounded-sc-md bg-gradient-to-br from-slate-800 to-slate-950 px-5 py-3 text-sm font-black text-white shadow-sc-card disabled:opacity-60"
              >
                {busy ? '…' : 'אימות'}
              </button>
            </div>
            {authNotice && <p className="mt-2 text-sm font-bold text-[var(--sc-accent-2)]">{authNotice}</p>}
            {authError && <p className="mt-2 text-sm font-bold text-red-500">{authError}</p>}
          </div>
          ) : null}

        </div>
      </div>
    </div>
  );
}
