import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const KEY = 'installBannerDismissed';

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS() {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
}

function wasDismissed() {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export default function InstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(() => isStandalone() || wasDismissed());

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault(); // Android/Chrome: keep it so we can trigger from our button
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setHidden(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const ios = isIOS();
  if (hidden || (!ios && !deferred)) return null;

  function dismiss() {
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      /* ignore */
    }
    setHidden(true);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  }

  return (
    <div className="install">
      <div>
        <strong>Install this app</strong>
        {ios ? (
          <p>
            In Safari, tap <b>Share</b> <span aria-hidden>⬆︎</span> then <b>Add to Home Screen</b>.
            Your records stay on this phone only.
          </p>
        ) : (
          <p>Add it to your home screen. Your records stay on this phone only.</p>
        )}
      </div>
      <div className="install-actions">
        {!ios && (
          <button className="primary" onClick={install}>
            Install
          </button>
        )}
        <button className="link" onClick={dismiss}>
          Not now
        </button>
      </div>
    </div>
  );
}
