import { useEffect, useRef, useState } from 'react';

interface GoogleId {
  initialize(config: { client_id: string; callback: (response: { credential: string }) => void }): void;
  renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
}

const SCRIPT_ID = 'google-gsi';
const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

function googleId(): GoogleId | undefined {
  return (window as unknown as { google?: { accounts?: { id?: GoogleId } } }).google?.accounts?.id;
}

export function GoogleButton({ clientId, onCredential }: { clientId: string; onCredential: (credential: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const callback = useRef(onCredential);
  callback.current = onCredential;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    function render() {
      const id = googleId();
      if (!active || !id || !container.current) return;
      id.initialize({ client_id: clientId, callback: ({ credential }) => callback.current(credential) });
      id.renderButton(container.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        locale: 'tr',
        width: 320,
      });
    }
    function fail() {
      if (active) setFailed(true);
    }

    if (googleId()) {
      render();
      return () => {
        active = false;
      };
    }
    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener('load', render);
    script.addEventListener('error', fail);
    return () => {
      active = false;
      script.removeEventListener('load', render);
      script.removeEventListener('error', fail);
    };
  }, [clientId]);

  return (
    <>
      <div ref={container} />
      {failed && <p className="login-error" role="alert">Google ile giriş şu an yüklenemedi.</p>}
    </>
  );
}
