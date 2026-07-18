import Link from 'next/link';
import { Icon } from '@letscycle/ui';
import { assetUrl } from '@/lib/asset';

interface AuthShellProps {
  title: string;
  subtitle?: string;
  art: string; // path under /public, e.g. /illustrations/login-art.svg
  artAlt: string;
  /** 'inline' (default): art sits below the text. 'background': art fills the panel. */
  artMode?: 'inline' | 'background';
  children: React.ReactNode;
}

/** Two-column auth shell: brand + illustration (left), form (right). */
export function AuthShell({
  title,
  subtitle,
  art,
  artAlt,
  artMode = 'inline',
  children,
}: AuthShellProps) {
  return (
    <div className="flex min-h-dvh">
      {/* Brand panel */}
      <aside className="relative hidden w-1/2 overflow-hidden lg:block">
        {artMode === 'background' ? (
          <>
            {/* Illustration fills the whole panel */}
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${assetUrl(art)})` }}
              role="img"
              aria-label={artAlt}
            />
            {/* Branding + text at the base, on a subtle glass panel for legibility */}
            <div className="absolute inset-x-0 bottom-0 p-8">
              <div className="max-w-sm rounded-2xl border border-white/40 bg-white/70 p-5 shadow-sm backdrop-blur">
                <Link href="/" className="flex items-center gap-2 text-primary">
                  <Icon name="Recycle" className="size-6" />
                  <span className="text-lg font-bold tracking-tight">LetsCycle</span>
                </Link>
                <h1 className="mt-2 text-xl font-bold leading-snug tracking-tight text-slate-900">
                  {title}
                </h1>
                {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col bg-secondary/50 p-10">
            <Link href="/" className="flex items-center gap-2 text-primary">
              <Icon name="Recycle" className="size-7" />
              <span className="text-xl font-bold tracking-tight">LetsCycle</span>
            </Link>
            <div className="flex flex-1 flex-col justify-center">
              <h1 className="max-w-sm text-2xl font-bold leading-snug tracking-tight text-secondary-foreground">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">{subtitle}</p>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element -- static illustration from public/ (or asset CDN) */}
              <img src={assetUrl(art)} alt={artAlt} className="mt-8 w-full max-w-md" />
            </div>
          </div>
        )}
      </aside>

      {/* Form panel */}
      <main className="flex flex-1 flex-col items-center justify-center px-5 py-10">
        <Link href="/" className="mb-8 flex items-center gap-2 text-primary lg:hidden">
          <Icon name="Recycle" className="size-7" />
          <span className="text-xl font-bold tracking-tight">LetsCycle</span>
        </Link>
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
