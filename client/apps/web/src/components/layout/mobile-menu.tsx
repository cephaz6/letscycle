'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LogOut, Menu, UserRound, X } from 'lucide-react';
import { buttonVariants, cn, Icon } from '@letscycle/ui';
import { SITE_CATEGORIES } from '@/lib/categories';
import { useAuth, useSignOut } from '@/features/auth';

/** Hamburger + closable slide-in drawer for mobile (account links + categories).
 *  Categories come from the shared list (DB-sourced later). */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const { user, isAuthenticated } = useAuth();
  const signOut = useSignOut();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="grid size-10 shrink-0 place-items-center rounded-full text-foreground transition-colors hover:bg-accent hover:text-accent-foreground lg:hidden"
      >
        <Menu className="size-6" />
      </button>

      <div
        className={cn('fixed inset-0 z-50 lg:hidden', !open && 'pointer-events-none')}
        aria-hidden={!open}
      >
        {/* Overlay */}
        <button
          type="button"
          tabIndex={open ? 0 : -1}
          aria-label="Close menu"
          onClick={close}
          className={cn(
            'absolute inset-0 bg-black/50 transition-opacity duration-300',
            open ? 'opacity-100' : 'opacity-0',
          )}
        />

        {/* Panel */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className={cn(
            'absolute inset-y-0 left-0 flex w-80 max-w-[85%] flex-col bg-background shadow-xl transition-transform duration-300 ease-out',
            open ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
            <Link
              href="/"
              onClick={close}
              className="flex items-center gap-1.5 text-primary"
            >
              <Icon name="Recycle" className="size-6" />
              <span className="text-lg font-bold tracking-tight">LetsCycle</span>
            </Link>
            <button
              type="button"
              aria-label="Close menu"
              onClick={close}
              className="grid size-9 place-items-center rounded-full text-foreground transition-colors hover:bg-accent"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {isAuthenticated && user ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3 rounded-xl border border-border p-3">
                  <span className="grid size-10 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    <UserRound className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      {user.displayName}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </span>
                </div>
                <Link
                  href="/me"
                  onClick={close}
                  className={cn(buttonVariants({ variant: 'outline' }), 'w-full rounded-full')}
                >
                  My profile
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    close();
                    void signOut();
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-accent"
                >
                  <LogOut className="size-4" /> Sign out
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link
                  href="/signup"
                  onClick={close}
                  className={cn(buttonVariants({ variant: 'primary' }), 'flex-1 rounded-full')}
                >
                  Sign up
                </Link>
                <Link
                  href="/login"
                  onClick={close}
                  className={cn(buttonVariants({ variant: 'outline' }), 'flex-1 rounded-full')}
                >
                  Log in
                </Link>
              </div>
            )}

            <p className="mb-1 mt-6 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Browse categories
            </p>
            <ul>
              {SITE_CATEGORIES.map((cat) => (
                <li key={cat.label}>
                  <Link
                    href="/"
                    onClick={close}
                    className="flex items-center gap-3 rounded-md px-2 py-2.5 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <Icon name={cat.icon} className="size-5 text-muted-foreground" strokeWidth={1.5} />
                    {cat.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
