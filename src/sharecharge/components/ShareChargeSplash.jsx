import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';
import { getShareChargeApp } from '../config/appConfig';

const flavorMeta = {
  client: { label: 'לקוח', gradient: 'from-[#007bff] via-[#0095ff] to-[#00d1c1]' },
  provider: { label: 'ספק', gradient: 'from-sky-600 via-blue-600 to-teal-500' },
  ops: { label: 'ניהול', gradient: 'from-slate-900 via-blue-900 to-teal-700' },
  all: { label: 'ShareCharge', gradient: 'from-[#007bff] via-[#0095ff] to-[#00d1c1]' },
};

export function ShareChargeSplash({ onDone }) {
  const [visible, setVisible] = useState(true);
  const meta = flavorMeta[getShareChargeApp()] || flavorMeta.all;

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, 800);
    return () => clearTimeout(t);
  }, [onDone]);

  if (!visible) return null;

  return (
    <div
      dir="rtl"
      className="sc-splash fixed inset-0 z-[100] flex items-center justify-center bg-[var(--sc-bg)]"
      aria-hidden={!visible}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="sc-splash-glow absolute -right-24 top-16 h-72 w-72 rounded-full bg-[var(--sc-accent)]/15 blur-3xl" />
        <div className="sc-splash-glow absolute -left-20 bottom-24 h-80 w-80 rounded-full bg-[var(--sc-accent-2)]/15 blur-3xl" />
      </div>
      <div className="relative flex flex-col items-center px-8 text-center">
        <div
          className={`sc-splash-logo flex h-24 w-24 items-center justify-center rounded-[1.75rem] bg-gradient-to-br ${meta.gradient} text-white shadow-sc-card`}
        >
          <Zap size={44} strokeWidth={2.25} />
        </div>
        <h1 className="mt-6 text-3xl font-black tracking-tight text-sc-text">ShareCharge</h1>
        <p className="mt-2 text-sm font-bold text-sc-muted">טעינה שיתופית · {meta.label}</p>
        <div className="sc-splash-bar mt-10 h-1.5 w-40 overflow-hidden rounded-full bg-white/80 shadow-inner">
          <div className="sc-splash-bar-fill h-full rounded-full bg-gradient-to-l from-[#007bff] to-[#00d1c1]" />
        </div>
      </div>
    </div>
  );
}
