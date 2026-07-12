import { useEffect, useRef } from 'react';

function loadGsiScript() {
  const scriptId = 'google-gsi-client';
  if (document.getElementById(scriptId)) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Sign-In'));
    document.head.appendChild(script);
  });
}

export function GoogleSignInButton({ clientId, onSuccess, onError, disabled }) {
  const containerRef = useRef(null);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [onSuccess, onError]);

  useEffect(() => {
    if (!clientId || disabled) return undefined;

    let cancelled = false;

    loadGsiScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google?.accounts?.id) return;

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response?.credential) onSuccessRef.current(response.credential);
            else onErrorRef.current?.(new Error('Google לא החזיר אסימון'));
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        containerRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          width: Math.min(containerRef.current.offsetWidth || 320, 400),
          locale: 'he',
        });
      })
      .catch((err) => onErrorRef.current?.(err));

    return () => {
      cancelled = true;
    };
  }, [clientId, disabled]);

  if (!clientId) return null;

  return (
    <div
      ref={containerRef}
      className={`flex min-h-[44px] w-full items-center justify-center ${disabled ? 'pointer-events-none opacity-50' : ''}`}
    />
  );
}
