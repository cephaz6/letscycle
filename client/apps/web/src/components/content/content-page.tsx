import Link from 'next/link';
import { cn } from '@letscycle/ui';

/**
 * Shared shell for the static site pages (about, legal, help…). Keeps one
 * header treatment and reading measure so the pages read as one site rather
 * than a pile of one-offs.
 */
export function ContentPage({
  title,
  lead,
  updated,
  wide,
  children,
}: {
  title: string;
  lead?: string;
  /** Shown under the title on policy pages. */
  updated?: string;
  /** Opt out of the narrow reading measure (for card grids). */
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full px-4 py-10 sm:px-6 lg:px-8">
      <header className={cn('mx-auto', wide ? 'max-w-5xl' : 'max-w-2xl')}>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        {lead && (
          <p className="mt-3 text-lg leading-relaxed text-muted-foreground">{lead}</p>
        )}
        {updated && (
          <p className="mt-3 text-sm text-muted-foreground">Last updated {updated}</p>
        )}
      </header>
      <div className={cn('mx-auto mt-10', wide ? 'max-w-5xl' : 'max-w-2xl')}>
        {children}
      </div>
    </div>
  );
}

/** A titled block of body copy. */
export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8 first:mt-0">
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      <div className="mt-2 space-y-3 text-[15px] leading-relaxed text-foreground/90">
        {children}
      </div>
    </section>
  );
}

export function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Native disclosure — keyboard accessible and works without JavaScript. */
export function Faq({ items }: { items: { q: string; a: React.ReactNode }[] }) {
  return (
    <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
      {items.map((item) => (
        <details key={item.q} className="group bg-card">
          <summary className="cursor-pointer list-none px-4 py-3.5 font-medium transition-colors hover:bg-accent/40 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between gap-3">
              {item.q}
              <span className="shrink-0 text-muted-foreground transition-transform group-open:rotate-45">
                +
              </span>
            </span>
          </summary>
          <div className="px-4 pb-4 text-[15px] leading-relaxed text-muted-foreground">
            {item.a}
          </div>
        </details>
      ))}
    </div>
  );
}

/** Numbered how-it-works style steps. */
export function Steps({ steps }: { steps: { title: string; body: string }[] }) {
  return (
    <ol className="space-y-4">
      {steps.map((step, i) => (
        <li key={step.title} className="flex gap-4">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {i + 1}
          </span>
          <div>
            <p className="font-semibold">{step.title}</p>
            <p className="mt-0.5 text-[15px] leading-relaxed text-muted-foreground">
              {step.body}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Closing call to action shared by the marketing-ish pages. */
export function ContentCta({
  title,
  body,
  actions,
}: {
  title: string;
  body: string;
  actions: { label: string; href: string; primary?: boolean }[];
}) {
  return (
    <section className="mt-12 rounded-2xl border border-border bg-muted/40 p-6 text-center">
      <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{body}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {actions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-medium transition-colors',
              a.primary
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'border border-border hover:bg-accent',
            )}
          >
            {a.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
