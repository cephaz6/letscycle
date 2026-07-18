'use client';

import Link from 'next/link';
import { useCategories, type Category } from '@letscycle/api-client';
import { Icon, Skeleton } from '@letscycle/ui';

/** Short strip label from a full category name ("Books, Music & Films" → "Books"). */
function shortLabel(name: string): string {
  return name.split(/[\s,&]+/)[0] ?? name;
}

/** Category bar sourced from the DB. Desktop: centered, fitted to the container.
 *  Mobile: a horizontally slidable strip (shown above the hero). */
export function CategoryNav() {
  const { data, isLoading } = useCategories();
  const categories = data ?? [];

  const links = isLoading ? (
    <SkeletonRow />
  ) : (
    <>
      {categories.map((cat) => (
        <CategoryLink key={cat.id} category={cat} />
      ))}
      <Link
        href="/"
        className="flex shrink-0 flex-col items-center gap-1.5 py-3 text-muted-foreground transition-colors hover:text-primary"
      >
        <Icon name="LayoutGrid" className="size-6" strokeWidth={1.5} />
        <span className="text-xs font-medium">All</span>
      </Link>
    </>
  );

  return (
    <>
      {/* Mobile: slidable strip */}
      <div className="bg-background lg:hidden">
        <div className="no-scrollbar flex gap-5 overflow-x-auto px-4 py-3">{links}</div>
      </div>

      {/* Desktop: centered, fitted to the container */}
      <div className="hidden bg-background lg:block">
        <nav className="mx-auto flex max-w-7xl justify-between px-4 sm:px-6 lg:px-8">
          {links}
        </nav>
      </div>
    </>
  );
}

function CategoryLink({ category }: { category: Category }) {
  return (
    <Link
      href={`/?category=${category.slug}`}
      title={category.name}
      className="flex shrink-0 flex-col items-center gap-1.5 py-3 text-muted-foreground transition-colors hover:text-primary"
    >
      <Icon name={category.iconName} className="size-6" strokeWidth={1.5} />
      <span className="text-xs font-medium">{shortLabel(category.name)}</span>
    </Link>
  );
}

function SkeletonRow() {
  return (
    <>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex shrink-0 flex-col items-center gap-1.5 py-3">
          <Skeleton className="size-6 rounded-md" />
          <Skeleton className="h-3 w-10" />
        </div>
      ))}
    </>
  );
}
