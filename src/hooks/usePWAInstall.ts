import { useEffect, useState, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type BrowserFamily = 'chrome' | 'edge' | 'safari' | 'firefox' | 'other';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [browser, setBrowser] = useState<BrowserFamily>('other');

  useEffect(() => {
    // Detect standalone mode (already installed as a PWA)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    // Detect if rendered inside an embedded preview iframe
    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }

    // Detect OS & Browser
    const ua = window.navigator.userAgent;
    const uaLower = ua.toLowerCase();
    const isIPadOS =
      navigator.platform === 'MacIntel' && typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 1;
    const iosDevice = /iphone|ipad|ipod/.test(uaLower) || isIPadOS;
    setIsIOS(iosDevice);
    setIsMac(!iosDevice && /macintosh|mac os x/.test(uaLower));

    if (/edg\//i.test(ua)) {
      setBrowser('edge');
    } else if (/firefox|fxios/i.test(ua)) {
      setBrowser('firefox');
    } else if (/chrome|crios/i.test(ua) && !/edg\//i.test(ua)) {
      setBrowser('chrome');
    } else if (/safari/i.test(ua) && !/chrome|crios|edg\//i.test(ua)) {
      setBrowser('safari');
    } else {
      setBrowser('other');
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    mediaQuery.addEventListener?.('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mediaQuery.removeEventListener?.('change', handleDisplayModeChange);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  }, [deferredPrompt]);

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    isMac,
    isInIframe,
    browser,
    install,
  };
}
