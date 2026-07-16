import Link from 'next/link';
import { Icon } from '@letscycle/ui';
import { SITE_CATEGORIES } from '@/lib/categories';

/**
 * Category bar (categories from the shared list → DB later). Desktop: centered,
 * fitted to the container, with a hover/focus dropdown per category. Mobile: a
 * horizontally slidable strip (shown above the hero).
 */
export function CategoryNav() {
  return (
    <>
      {/* Mobile: slidable strip */}
      <div className="bg-background lg:hidden">
        <div className="no-scrollbar flex gap-5 overflow-x-auto px-4 py-3">
          {SITE_CATEGORIES.map((cat) => (
            <Link
              key={cat.label}
              href="/"
              className="flex shrink-0 flex-col items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary"
            >
              <Icon name={cat.icon} className="size-6" strokeWidth={1.5} />
              <span className="text-xs font-medium">{cat.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Desktop: centered nav with hover menus */}
      <div className="hidden bg-background lg:block">
      <nav className="mx-auto flex max-w-7xl justify-between px-4 sm:px-6 lg:px-8">
        {SITE_CATEGORIES.map((cat) => (
          <div key={cat.label} className="group relative">
            <Link
              href="/"
              className="flex flex-col items-center gap-1.5 py-3 text-muted-foreground transition-colors group-hover:text-primary"
            >
              <Icon name={cat.icon} className="size-6" strokeWidth={1.5} />
              <span className="text-xs font-medium">{cat.label}</span>
            </Link>

            {/* Hover menu — `pt-2` bridges the gap so hover isn't lost. */}
            <div className="invisible absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2 opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
              <div className="w-52 rounded-xl border border-border bg-card p-2 shadow-xl">
                <p className="px-3 pb-1.5 pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {cat.label}
                </p>
                <ul>
                  {cat.items.map((item) => (
                    <li key={item}>
                      <Link
                        href="/"
                        className="block rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}

        <Link
          href="/"
          className="flex flex-col items-center gap-1.5 py-3 text-muted-foreground transition-colors hover:text-primary"
        >
          <Icon name="LayoutGrid" className="size-6" strokeWidth={1.5} />
          <span className="text-xs font-medium">View all</span>
        </Link>
      </nav>
      </div>
    </>
  );
}
