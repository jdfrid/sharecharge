import { useCallback, useRef, useState } from 'react';

const INTRO_VIDEO_SRC = `${import.meta.env.BASE_URL}videos/sharecharge-intro.mp4`;

export function ClientIntroVideo({ onDone }) {
  const videoRef = useRef(null);
  const [visible, setVisible] = useState(true);
  const [error, setError] = useState(false);

  const finish = useCallback(() => {
    setVisible(false);
    onDone?.();
  }, [onDone]);

  if (!visible) return null;

  return (
    <div
      dir="ltr"
      className="fixed inset-0 z-[98] flex flex-col bg-black"
      role="dialog"
      aria-label="סרטון פתיחה"
    >
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        src={INTRO_VIDEO_SRC}
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={finish}
        onError={() => setError(true)}
      />

      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a2332] px-8 text-center text-white">
          <p className="text-sm font-bold text-white/80">לא ניתן לטעון את סרטון הפתיחה</p>
          <button
            type="button"
            onClick={finish}
            className="mt-4 rounded-full bg-[var(--sc-accent)] px-6 py-2 text-sm font-black text-white"
          >
            המשך
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={finish}
          className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 rounded-full border border-white/30 bg-black/45 px-5 py-2 text-xs font-black text-white backdrop-blur-sm"
        >
          דלג ›
        </button>
      )}
    </div>
  );
}
