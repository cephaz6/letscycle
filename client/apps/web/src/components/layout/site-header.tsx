import Link from 'next/link';
import { Bell, Heart, Search } from 'lucide-react';
import { buttonVariants, cn, Icon, ThemeToggle } from '@letscycle/ui';
import { MobileMenu } from './mobile-menu';
import { AccountMenu } from './account-menu';
import { MessagesNavLink } from '@/features/messaging';

/** Full-width site header: neutral brand bar. The category nav is a separate
 *  strip below (see CategoryNav), so the rule sits under the search, above it. */
export function SiteHeader() {
  return (
    <header className="flex h-16 w-full items-center gap-3 border-b border-border bg-background px-4 sm:gap-5 sm:px-6 lg:px-8">
      <MobileMenu />

      <Link
        href="/"
        className="flex shrink-0 items-center gap-1.5 text-primary"
        aria-label="LetsCycle home"
      >
        <Icon name="Recycle" className="size-7" />
        <span className="hidden text-xl font-bold tracking-tight sm:inline">
          LetsCycle
        </span>
      </Link>

      {/* Search hides on mobile — the hero carries a floating search there. */}
      <form role="search" className="relative hidden flex-1 sm:block" action="/">
        <input
          type="search"
          name="q"
          placeholder="Search for anything"
          aria-label="Search listings"
          className="h-11 w-full rounded-full border border-input bg-muted/60 pl-5 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        />
        <button
          type="submit"
          aria-label="Search"
          className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
        >
          <Search className="size-5" />
        </button>
      </form>

      <nav className="ml-auto flex shrink-0 items-center gap-1 sm:ml-0 sm:gap-2">
        <button
          type="button"
          aria-label="Notifications"
          className="relative grid size-10 place-items-center rounded-full text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Bell className="size-5" />
          <span className="absolute right-2 top-2 size-2 rounded-full bg-destructive ring-2 ring-background" />
        </button>
        <Link
          href="/wishlist"
          aria-label="Saved items"
          className="hidden size-10 place-items-center rounded-full text-foreground transition-colors hover:bg-accent hover:text-accent-foreground sm:grid"
        >
          <Heart className="size-5" />
        </Link>
        <MessagesNavLink />

        <ThemeToggle />

        <Link href="/sell" className={cn(buttonVariants({ size: 'sm' }), 'rounded-full')}>
          Sell
        </Link>

        <AccountMenu />
      </nav>
    </header>
  );
}
