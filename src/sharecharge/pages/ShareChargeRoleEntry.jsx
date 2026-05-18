import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { roleEntryConfig, SHARECHARGE_ROLE_KEYS } from '../constants';
import { createOtp, shortTime } from '../utils';
import { clearAuthSession, loadAuthSessions, setAuthSession } from '../auth/session';

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

  const sendEmailOtp = () => {
    if (!email.includes('@')) {
      setAuthError('יש להזין כתובת מייל תקינה');
      return;
    }
    setSentOtp(createOtp());
    setOtpInput('');
    setAuthError('');
    setSentAt(Date.now());
  };

  const verifyEmailOtp = () => {
    if (!sentOtp) {
      setAuthError('קודם יש לשלוח קוד למייל');
      return;
    }
    if (otpInput.trim() !== sentOtp) {
      setAuthError('קוד שגוי. נסה שוב או שלח קוד חדש');
      return;
    }
    setAuthError('');
    setAuthSession(portal, { verified: true, email, verifiedAt: Date.now() });
    navigate(portalPaths[portal], { replace: true });
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
        <div className="pointer-events-none absolute -right-20 top-10 h-60 w-60 rounded-full bg-[var(--sc-accent)]/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-24 h-72 w-72 rounded-full bg-teal-300/20 blur-3xl" />

        <div className="relative z-10 flex items-center justify-between">
          <Link to="/sharecharge" className="rounded-sc-sm bg-white px-4 py-2 text-sm font-black text-[var(--sc-accent)] shadow-sc-card ring-1 ring-slate-100">
            ← בחירת אפליקציה
          </Link>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-teal-700 shadow-sm ring-1 ring-slate-100">
            דמו מאובטח
          </span>
        </div>

        <section className="relative z-10 my-6 rounded-sc-lg bg-white p-5 shadow-sc-card ring-1 ring-slate-100/90">
          <div className="relative mx-auto mb-6 flex h-44 w-full items-center justify-center overflow-hidden rounded-sc-md bg-gradient-to-br from-[var(--sc-surface)] to-teal-50">
            <img src="/sharecharge-logo.png" alt="" className="h-full w-full object-cover opacity-95" />
            <div className="absolute inset-x-4 bottom-3 rounded-sc-sm bg-white/95 px-4 py-3 shadow-md backdrop-blur">
              <p className="text-sm font-black text-sc-text">{config.title}</p>
              <p className="text-xs font-bold text-sc-muted">הזדהות לפי מייל · OTP בדמו</p>
            </div>
          </div>

          <div className="text-center">
            <div
              className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br ${config.gradient} text-white shadow-lg`}
            >
              <Icon size={28} />
            </div>
            <h1 className="text-3xl font-black tracking-tight">{config.title}</h1>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-7 text-sc-muted">{config.subtitle}</p>
            <div className="mt-5 grid gap-2">
              {config.points.map((point) => (
                <div key={point} className="flex items-center gap-2 rounded-sc-sm bg-[var(--sc-surface)] px-4 py-3 text-sm font-bold text-sc-text">
                  <CheckCircle size={17} className="text-[var(--sc-accent)] shrink-0" />
                  <span className="text-right">{point}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="relative z-10 space-y-3">
          <div className="rounded-sc-lg bg-white p-4 shadow-sc-card ring-1 ring-slate-100">
            <p className="mb-3 text-sm font-black text-[var(--sc-accent)]">OTP לדמו</p>
            <label className="text-xs font-bold text-sc-muted">
              כתובת מייל
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full rounded-sc-sm bg-slate-50 px-4 py-3 text-right text-sm font-black text-sc-text outline-none ring-1 ring-slate-100"
                inputMode="email"
                dir="ltr"
              />
            </label>
            <button
              type="button"
              onClick={sendEmailOtp}
              className="mt-3 w-full rounded-sc-sm bg-[var(--sc-accent)] px-5 py-3 text-sm font-black text-white shadow-sc-card"
            >
              שלח קוד OTP
            </button>

            {sentOtp && (
              <div className="mt-3 rounded-sc-sm bg-[var(--sc-surface)] p-3 ring-1 ring-slate-100">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-sc-muted">דמו</p>
                    <p className="truncate text-sm font-black">{email}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[var(--sc-accent)] px-3 py-1 text-xs font-black text-white">
                    {sentAt ? shortTime(sentAt) : ''}
                  </span>
                </div>
                <p className="mt-2 text-xs text-sc-muted">קוד הכניסה:</p>
                <p className="mt-1 font-mono text-3xl font-black tracking-[0.28em] text-[var(--sc-accent)]">{sentOtp}</p>
              </div>
            )}

            <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
              <input
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="קוד"
                className="rounded-sc-sm bg-slate-50 px-4 py-3 text-center font-mono text-xl font-black tracking-[0.2em] outline-none ring-1 ring-slate-100"
                inputMode="numeric"
                maxLength={4}
                dir="ltr"
              />
              <button
                type="button"
                onClick={verifyEmailOtp}
                className="rounded-sc-sm bg-sc-text px-5 py-3 text-sm font-black text-white shadow-md"
              >
                אימות
              </button>
            </div>
            {authError && <p className="mt-2 text-sm font-bold text-red-500">{authError}</p>}
          </div>

          {sessions[portal]?.verified && (
            <p className="text-center text-xs font-bold text-teal-700">
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
