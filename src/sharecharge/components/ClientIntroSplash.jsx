import { useEffect, useState } from 'react';

const INTRO_KEY = 'sharecharge-intro-seen-v1';
const HERO_IMAGE = `${import.meta.env.BASE_URL}images/intro-stuck-car.svg`;

export function wasIntroSeen() {
  try {
    return localStorage.getItem(INTRO_KEY) === '1';
  } catch {
    return false;
  }
}

export function markIntroSeen() {
  try {
    localStorage.setItem(INTRO_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function ClientIntroSplash({ onDone }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(finish, 2800);
    return () => clearTimeout(t);
  }, []);

  const finish = () => {
    markIntroSeen();
    setVisible(false);
    onDone?.();
  };

  if (!visible) return null;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[99] flex flex-col bg-[#0f172a] text-white"
      role="dialog"
      aria-label="פתיחה"
      onClick={finish}
      onKeyDown={(e) => e.key === 'Enter' && finish()}
    >
      <div
        className="relative flex-1 bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(26,35,50,0.1) 0%, rgba(26,35,50,0.92) 72%), url(${HERO_IMAGE})`,
        }}
      />
      <div className="px-8 pb-12 pt-6 text-center">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-white/60">ShareCharge</p>
        <h1 className="mt-3 text-2xl font-black leading-snug">כשאתה תקוע — אנחנו כאן בשבילך</h1>
        <p className="mt-2 text-sm font-bold text-white/70">טעינה · חירום · עזרה בדרך</p>
        <div className="mx-auto mt-8 h-1 w-40 overflow-hidden rounded-full bg-white/20">
          <div className="sc-intro-progress h-full rounded-full bg-[var(--sc-accent)]" />
        </div>
        <button type="button" className="mt-6 text-xs font-bold text-white/55 underline" onClick={finish}>
          דלג
        </button>
      </div>
    </div>
  );
}
