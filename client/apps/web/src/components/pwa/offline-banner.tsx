'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

/**
 * Tells people the connection dropped, so a failed action reads as "no signal"
 * rather than "this app is broken". Browsing still works from cache.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-foreground px-4 py-2 text-sm font-medium text-background"
    >
      <WifiOff className="size-4" />
      You’re offline — showing what we already had.
    </div>
  );
}
