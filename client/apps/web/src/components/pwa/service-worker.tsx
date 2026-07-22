'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker in production only — in development it would
 * serve stale bundles and make changes look like they haven't applied.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    const onLoad = () => {
      void navigator.serviceWorker.register('/sw.js').catch(() => {
        // Registration failing shouldn't break the page — the app works
        // perfectly well without offline support.
      });
    };

    if (document.readyState === 'complete') onLoad();
    else window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  return null;
}
