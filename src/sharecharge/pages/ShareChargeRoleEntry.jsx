import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { roleEntryConfig, SHARECHARGE_ROLE_KEYS } from '../constants';
import { getPreferredRepositoryMode } from '../data/apiRepository.stub';
import { sendOtp, verifyOtp } from '../data/sharechargeApi';
import { createOtp, shortTime } from '../utils';
import { clearAuthSession, loadAuthSessions, setAuthSession } from '../auth/session';
import { isSingleAppBuild } from '../config/appConfig';

const portalPaths = {
  [SHARECHARGE_ROLE_KEYS.client]: '/client/discover',
  [SHARECHARGE_ROLE_KEYS.provider]: '/provider/dashboard',
  [SHARECHARGE_ROLE_KEYS.system]: '/ops/dashboard',
};

export function ShareChargeRoleEntry({ portal }) {
  const navigate = useNavigate();
  const config = roleEntryConfig[portal] || roleEntryConfig.client;
  const Icon = config.icon;
  const [email, setEmail] = useState(config.email);
  const [sentOtp, setSentOtp] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [sentAt, setSentAt] = useState(null);

  const useApi = getPreferredRepositoryMode() === 'api';

  const sendEmailOtp = async () => {
    if (!email.includes('@')) {
      setAuthError('יש להזין כתובת מייל תקינה');
      return;
    }
    setAuthError('');
    try {
      if (useApi) {
        const data = await sendOtp(email, portal);
        setSentOtp(data.devCode || 'sent');
        setOtpInput(data.devCode || '');
      } else {
        const code = createOtp();
        setSentOtp(code);
        setOtpInput('');
      }
      setSentAt(Date.now());
    } catch (err) {
      setAuthError(err.message || 'שליחת קוד נכשלה');
    }
  };

  const verifyEmailOtp = async () => {
    if (!sentOtp && !useApi) {
      setAuthError('קודם יש לשלוח קוד למייל');
      return;
    }
    setAuthError('');
    try {
      if (useApi) {
        const data = await verifyOtp(email, portal, otpInput.trim());
        setAuthSession(portal, {
          verified: true,
          email: data.user?.email || email,
          verifiedAt: Date.now(),
          token: data.token,
        });
      } else {
        if (otpInput.trim() !== sentOtp) {
          setAuthError('קוד שגוי. נסה שוב או שלח קוד חדש');
          return;
        }
        setAuthSession(portal, { verified: true, email, verifiedAt: Date.now() });
      }
      navigate(portalPaths[portal], { replace: true });
    } catch (err) {
      setAuthError(err.message || 'אימות נכשל');
    }
  };

  useEffect(() => {
    const s = loadAuthSessions();
    if (s[portal]?.verified) {
      navigate(portalPaths[portal], { replace: true });
    }
  }, [portal, navigate]);

  const sessions = loadAuthSessions();

  return (
    <div dir="rtl" className="sc-skin sc-no-motion min-h-screen bg-[var(--sc-bg)] text-sc-text">
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col overflow-hidden px-4 py-[calc(1rem+env(safe-area-inset-top,0px))] pb-8">
        <div className="pointer-events-none absolute -right-24 top-8 h-56 w-56 rounded-full bg-[var(--sc-accent)]/8 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-32 h-64 w-64 rounded-full bg-[var(--sc-accent-2)]/8 blur-3xl" />

        <div className="relative z-10 flex items-center justify-between">
          {!isSingleAppBuild ? (
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
            אימות מאובטח
          </span>
        </div>

        <section className="relative z-10 my-6 rounded-sc-lg border border-sc-border bg-white p-5 shadow-sc-card">
          <div className="relative mx-auto mb-6 flex h-44 w-full items-center justify-center overflow-hidden rounded-sc-md border border-sc-border bg-gradient-to-br from-[var(--sc-surface)] to-white">
            <img src="/sharecharge-logo.png" alt="" className="h-full w-full object-cover opacity-95" />
            <div className="absolute inset-x-4 bottom-3 rounded-sc-sm border border-sc-border bg-white px-4 py-3 shadow-sm">
              <p className="text-sm font-black text-sc-text">{config.title}</p>
              <p className="text-xs font-bold text-sc-muted">הזדהות לפי מייל וקוד חד-פעמי</p>
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
            <div className="mt-5 grid gap-2">
              {config.points.map((point) => (
                <div
                  key={point}
                  className="flex items-center gap-2 rounded-sc-sm border border-sc-border bg-sc-surface px-4 py-3 text-sm font-bold text-sc-text"
                >
                  <CheckCircle size={17} className="shrink-0 text-[var(--sc-accent)]" />
                  <span className="text-right">{point}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="relative z-10 space-y-3">
          <div className="rounded-sc-lg border border-sc-border bg-white p-4 shadow-sc-card">
            <p className="mb-3 text-sm font-black text-[var(--sc-accent)]">קוד אימות</p>
            <label className="text-xs font-bold text-sc-muted">
              כתובת מייל
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="sc-field text-right text-sm"
                inputMode="email"
                dir="ltr"
              />
            </label>
            <button type="button" onClick={sendEmailOtp} className="sc-btn-primary mt-3 !text-sm">
              שלח קוד OTP
            </button>

                {useApi && sentOtp ? (
                  <p className="mt-2 text-xs text-sc-muted">הקוד נשלח — בדוק לוג שרver ב-dev או הזן את הקוד מהמייל.</p>
                ) : null}
                {!useApi && sentOtp ? (
              <div className="mt-3 rounded-sc-sm border border-sc-border bg-sc-surface p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-sc-muted">נשלח אליכם</p>
                    <p className="truncate text-sm font-black">{email}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[var(--sc-accent)] px-3 py-1 text-xs font-black text-white">
                    {sentAt ? shortTime(sentAt) : ''}
                  </span>
                </div>
                <p className="mt-2 text-xs text-sc-muted">קוד הכניסה:</p>
                <p className="mt-1 font-mono text-3xl font-black tracking-[0.28em] text-[var(--sc-accent)]">{sentOtp}</p>
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
              />
              <button
                type="button"
                onClick={verifyEmailOtp}
                className="self-center rounded-sc-md bg-gradient-to-br from-slate-800 to-slate-950 px-5 py-3 text-sm font-black text-white shadow-sc-card"
              >
                אימות
              </button>
            </div>
            {authError && <p className="mt-2 text-sm font-bold text-red-500">{authError}</p>}
          </div>

          {sessions[portal]?.verified && (
            <p className="text-center text-xs font-bold text-[var(--sc-accent-2)]">
              כבר מחוברים — המערכת תעביר אתכם אחרי האימות הבא או{' '}
              <button
                type="button"
                className="font-black underline"
                onClick={() => {
                  clearAuthSession(portal);
                  window.location.reload();
                }}
              >
                ניקוי סשן
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
