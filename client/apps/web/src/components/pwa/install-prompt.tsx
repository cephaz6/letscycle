'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@letscycle/ui';

/** The install event isn't in lib.dom yet. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'letscycle:install-dismissed';

/**
 * Install nudge, shown only when the browser says the app is actually
 * installable. Dismissing it is remembered, because a banner that keeps coming
 * back is worse than never showing one.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) return;

    const onPrompt = (e: Event) => {
      // Keep the event so we can trigger the native dialog from our own button.
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDeferred(null);

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!deferred) return null;

  function dismiss(): void {
    localStorage.setItem(DISMISSED_KEY, '1');
    setDeferred(null);
  }

  async function install(): Promise<void> {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  }

  return (
    <div className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-sm rounded-2xl border border-border bg-card p-4 shadow-xl sm:left-auto sm:right-4">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <Download className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Add LetsCycle to your home screen</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Faster to open, and it still works when your signal drops.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" className="rounded-full" onClick={() => void install()}>
              Install
            </Button>
            <Button size="sm" variant="ghost" className="rounded-full" onClick={dismiss}>
              Not now
            </Button>
          </div>
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={dismiss}
          className="-mr-1 -mt-1 grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-accent"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
