'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  HandCoins,
  Heart,
  LogOut,
  Receipt,
  Settings,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { buttonVariants, cn } from '@letscycle/ui';
import { useAuth, useSignOut } from '@/features/auth';
import { Avatar } from '@/components/avatar';

/** Header account area: sign-in links when anonymous, avatar menu when signed in. */
export function AccountMenu() {
  const { status, user } = useAuth();
  const signOut = useSignOut();
  const [open, setOpen] = useState(false);

  if (status !== 'authenticated' || !user) {
    return (
      <>
        <Link
          href="/signup"
          className="hidden rounded-full px-3 py-2 text-sm font-medium text-foreground transition-colors hover:text-primary md:inline-block"
        >
          Sign up
        </Link>
        <Link
          href="/login"
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'rounded-full',
          )}
        >
          Log in
        </Link>
      </>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Account menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Avatar
          name={user.displayName}
          avatarUrl={user.avatarUrl}
          className="size-9 text-xs"
        />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
            <div className="border-b border-border px-4 py-3">
              <p className="truncate text-sm font-semibold">{user.displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
            <Link
              href="/me"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-accent"
            >
              <UserRound className="size-4" /> My profile
            </Link>
            <Link
              href="/wishlist"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-accent"
            >
              <Heart className="size-4" /> Saved items
            </Link>
            <Link
              href="/wanted"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-accent"
            >
              <Sparkles className="size-4" /> Wanted
            </Link>
            <Link
              href="/transactions"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-accent"
            >
              <Receipt className="size-4" /> My orders
            </Link>
            <Link
              href="/selling"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-accent"
            >
              <HandCoins className="size-4" /> Selling
            </Link>
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-accent"
            >
              <Settings className="size-4" /> Settings
            </Link>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                void signOut();
              }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-destructive transition-colors hover:bg-accent"
            >
              <LogOut className="size-4" /> Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
