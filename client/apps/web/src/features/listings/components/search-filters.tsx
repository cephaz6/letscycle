'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCategories, type ListingSort } from '@letscycle/api-client';
import { Button, cn, Input } from '@letscycle/ui';
import { Field } from '@/features/auth/form-parts';

export interface SearchFilterValues {
  q: string;
  category: string; // slug, '' = any
  type: '' | 'sell' | 'giveaway';
  min: string; // £ as typed
  max: string;
  sort: ListingSort;
}

const TYPES: { value: SearchFilterValues['type']; label: string }[] = [
  { value: '', label: 'Any' },
  { value: 'sell', label: 'For sale' },
  { value: 'giveaway', label: 'Free' },
];

const SORTS: { value: ListingSort; label: string }[] = [
  { value: 'recent', label: 'Newest first' },
  { value: 'relevance', label: 'Best match' },
  { value: 'priceAsc', label: 'Price: low to high' },
  { value: 'priceDesc', label: 'Price: high to low' },
];

/** Reads the current filters out of the URL. The URL is the source of truth so
 *  a search is shareable and the back button works. Memoised on the raw values
 *  so the returned object is referentially stable — callers use it as an effect
 *  and query-param dependency. */
export function useSearchFilters(): SearchFilterValues {
  const params = useSearchParams();
  const q = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const type = params.get('type');
  const min = params.get('min') ?? '';
  const max = params.get('max') ?? '';
  const sort = params.get('sort');

  return useMemo(
    () => ({
      q,
      category,
      type: type === 'sell' || type === 'giveaway' ? type : '',
      min,
      max,
      sort: SORTS.find((s) => s.value === sort)?.value ?? 'recent',
    }),
    [q, category, type, min, max, sort],
  );
}

export function SearchFilters({ current }: { current: SearchFilterValues }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: categories } = useCategories();
  const [draft, setDraft] = useState(current);

  // Keep the panel in step with back/forward navigation.
  useEffect(() => setDraft(current), [current]);

  function apply(next: SearchFilterValues) {
    const params = new URLSearchParams();
    if (next.q.trim()) params.set('q', next.q.trim());
    if (next.category) params.set('category', next.category);
    if (next.type) params.set('type', next.type);
    if (next.min.trim()) params.set('min', next.min.trim());
    if (next.max.trim()) params.set('max', next.max.trim());
    if (next.sort !== 'recent') params.set('sort', next.sort);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  /** Selects/segments apply straight away; typed fields wait for submit so we
   *  don't fire a request per keystroke. */
  function set<K extends keyof SearchFilterValues>(
    key: K,
    value: SearchFilterValues[K],
    immediate = false,
  ) {
    const next = { ...draft, [key]: value };
    setDraft(next);
    if (immediate) apply(next);
  }

  const cleared: SearchFilterValues = {
    q: '',
    category: '',
    type: '',
    min: '',
    max: '',
    sort: 'recent',
  };
  const isDirty =
    Boolean(
      current.q || current.category || current.type || current.min || current.max,
    ) || current.sort !== 'recent';

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        apply(draft);
      }}
      className="space-y-5 rounded-2xl border border-border bg-card p-4"
    >
      <Field label="Keyword" htmlFor="f-q">
        <Input
          id="f-q"
          type="search"
          placeholder="e.g. road bike"
          value={draft.q}
          onChange={(e) => set('q', e.target.value)}
        />
      </Field>

      <Field label="Category" htmlFor="f-category">
        <select
          id="f-category"
          value={draft.category}
          onChange={(e) => set('category', e.target.value, true)}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Any category</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Type" htmlFor="f-type">
        <div className="flex gap-2" id="f-type">
          {TYPES.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => set('type', t.value, true)}
              className={cn(
                'flex-1 rounded-full border px-2 py-2 text-sm font-medium transition-colors',
                draft.type === t.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input hover:bg-accent',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Field>

      {draft.type !== 'giveaway' && (
        <Field label="Price (£)" htmlFor="f-min">
          <div className="flex items-center gap-2">
            <Input
              id="f-min"
              inputMode="decimal"
              placeholder="Min"
              value={draft.min}
              onChange={(e) => set('min', e.target.value)}
            />
            <span className="text-muted-foreground">–</span>
            <Input
              inputMode="decimal"
              placeholder="Max"
              aria-label="Maximum price"
              value={draft.max}
              onChange={(e) => set('max', e.target.value)}
            />
          </div>
        </Field>
      )}

      <Field label="Sort by" htmlFor="f-sort">
        <select
          id="f-sort"
          value={draft.sort}
          onChange={(e) => set('sort', e.target.value as ListingSort, true)}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </Field>

      <div className="flex gap-2">
        <Button type="submit" className="flex-1 rounded-full">
          Apply
        </Button>
        {isDirty && (
          <Button
            type="button"
            variant="ghost"
            className="rounded-full"
            onClick={() => {
              setDraft(cleared);
              apply(cleared);
            }}
          >
            Clear
          </Button>
        )}
      </div>
    </form>
  );
}
