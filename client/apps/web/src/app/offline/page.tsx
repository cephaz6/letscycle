import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Offline · LetsCycle',
};

/**
 * Served by the service worker when a page is requested with no connection and
 * nothing cached for it. Deliberately static — no data fetching, since by
 * definition there is no network.
 */
export default function OfflinePage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-muted text-2xl">
        📡
      </span>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">You’re offline</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We couldn’t reach LetsCycle. Pages you’ve already opened will still work —
        anything new needs a connection.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
      >
        Try again
      </Link>
    </div>
  );
}
