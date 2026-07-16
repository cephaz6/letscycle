import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { buttonVariants, cn, Icon } from '@letscycle/ui';

interface ErrorAction {
  href: string;
  label: string;
}

interface ErrorPageProps {
  code: string;
  title: string;
  message: string;
  icon: LucideIcon;
  primary: ErrorAction;
  secondary?: ErrorAction;
}

/** Branded, self-contained error page shared by 404 / 403 (and future codes). */
export function ErrorPage({
  code,
  title,
  message,
  icon: AccentIcon,
  primary,
  secondary,
}: ErrorPageProps) {
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
            {code}
          </span>
          <span className="absolute -right-4 -top-3 grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary shadow-sm ring-1 ring-primary/10">
            <AccentIcon className="size-6" />
          </span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mx-auto mt-2 max-w-sm text-muted-foreground">{message}</p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href={primary.href}
            className={cn(buttonVariants({ size: 'lg' }), 'rounded-full')}
          >
            {primary.label}
          </Link>
          {secondary && (
            <Link
              href={secondary.href}
              className={cn(
                buttonVariants({ variant: 'outline', size: 'lg' }),
                'rounded-full',
              )}
            >
              {secondary.label}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
