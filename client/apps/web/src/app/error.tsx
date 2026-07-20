'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { RotateCw, TriangleAlert } from 'lucide-react';
import { Button, buttonVariants, cn, Icon } from '@letscycle/ui';

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface for debugging; a real app would report to an error service.
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-dvh place-items-center bg-background px-4 py-16">
      <div className="w-full max-w-md text-center">
        <Link
          href="/"
          className="mb-12 inline-flex items-center gap-2 text-primary"
          aria-label="LetsCycle home"
        >
          <Icon name="Recycle" className="size-7" />
          <span className="text-xl font-bold tracking-tight">LetsCycle</span>
        </Link>

        <div className="relative mx-auto mb-6 w-fit">
          <span className="block bg-linear-to-br from-primary to-emerald-600 bg-clip-text text-8xl font-black leading-none tracking-tighter text-transparent sm:text-9xl">
            Oops
          </span>
          <span className="absolute -right-4 -top-3 grid size-12 place-items-center rounded-2xl bg-warning/15 text-warning shadow-sm ring-1 ring-warning/20">
            <TriangleAlert className="size-6" />
          </span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
        <p className="mx-auto mt-2 max-w-sm text-muted-foreground">
          An unexpected error occurred. You can try again, or head back home.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button size="lg" className="rounded-full" onClick={() => reset()}>
            <RotateCw className="size-4" /> Try again
          </Button>
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'lg' }),
              'rounded-full',
            )}
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
