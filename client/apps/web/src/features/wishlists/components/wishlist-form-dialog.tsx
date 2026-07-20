'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  useCategories,
  useCreateWishlistItem,
  useUpdateWishlistItem,
  type ListingTypePreference,
  type WishlistItem,
} from '@letscycle/api-client';
import { Button, cn, Input } from '@letscycle/ui';
import { Field } from '@/features/auth/form-parts';

const TYPE_OPTIONS: { value: ListingTypePreference; label: string }[] = [
  { value: 'both', label: 'Any' },
  { value: 'sell', label: 'For sale' },
  { value: 'giveaway', label: 'Giveaway' },
];

/** Create or edit a "want". Pass `item` to edit; omit to create. */
export function WishlistFormDialog({
  item,
  open,
  onClose,
}: {
  item?: WishlistItem;
  open: boolean;
  onClose: () => void;
}) {
  const { data: categories } = useCategories();
  const create = useCreateWishlistItem();
  const update = useUpdateWishlistItem();
  const isEdit = Boolean(item);

  const [categoryId, setCategoryId] = useState<string>('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordDraft, setKeywordDraft] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [distanceKm, setDistanceKm] = useState('10');
  const [typePref, setTypePref] = useState<ListingTypePreference>('both');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCategoryId(item?.categoryId ?? '');
    setKeywords(item?.keywords ?? []);
    setKeywordDraft('');
    setMaxPrice(item?.maxPricePence != null ? (item.maxPricePence / 100).toFixed(2) : '');
    setDistanceKm(String(item?.maxDistanceKm ?? 10));
    setTypePref(item?.listingTypePreference ?? 'both');
    setError(null);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, item, onClose]);

  if (!open) return null;

  function addKeyword() {
    const k = keywordDraft.trim().slice(0, 50);
    if (!k) return;
    if (keywords.length >= 20 || keywords.includes(k)) return setKeywordDraft('');
    setKeywords([...keywords, k]);
    setKeywordDraft('');
  }

  const busy = create.isPending || update.isPending;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const distance = Number.parseInt(distanceKm, 10);
    if (!Number.isFinite(distance) || distance < 1 || distance > 500) {
      return setError('Set a distance between 1 and 500 km.');
    }

    let maxPricePence: number | null = null;
    if (typePref !== 'giveaway' && maxPrice.trim()) {
      const parsed = Number.parseFloat(maxPrice);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return setError('Enter a valid maximum price, or leave it blank.');
      }
      maxPricePence = Math.round(parsed * 100);
    }

    const payload = {
      categoryId: categoryId || null,
      keywords,
      maxPricePence,
      maxDistanceKm: distance,
      listingTypePreference: typePref,
    };

    try {
      if (item) {
        await update.mutateAsync({ id: item.id, input: payload });
      } else {
        await create.mutateAsync(payload);
      }
      onClose();
    } catch {
      setError('Couldn’t save. Please try again.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? 'Edit wish' : 'New wish'}
        className="relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl"
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {isEdit ? 'Edit wish' : 'What are you after?'}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full hover:bg-accent"
          >
            <X className="size-5" />
          </button>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          We’ll ping you when a matching item is posted near you.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Category (optional)" htmlFor="wish-category">
            <select
              id="wish-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Any category</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Keywords (optional)" htmlFor="wish-keywords">
            <Input
              id="wish-keywords"
              placeholder="e.g. road bike, blue — Enter to add"
              value={keywordDraft}
              onChange={(e) => setKeywordDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  addKeyword();
                }
              }}
            />
            {keywords.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {keywords.map((k) => (
                  <span
                    key={k}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs"
                  >
                    {k}
                    <button
                      type="button"
                      aria-label={`Remove ${k}`}
                      onClick={() => setKeywords(keywords.filter((x) => x !== k))}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </Field>

          <Field label="I’m looking for" htmlFor="wish-type">
            <div className="flex gap-2" id="wish-type">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTypePref(opt.value)}
                  className={cn(
                    'flex-1 rounded-full border px-3 py-2 text-sm font-medium transition-colors',
                    typePref === opt.value
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input hover:bg-accent',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Field>

          {typePref !== 'giveaway' && (
            <Field label="Max price (optional)" htmlFor="wish-price">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  £
                </span>
                <input
                  id="wish-price"
                  inputMode="decimal"
                  placeholder="Any"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background pl-7 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </Field>
          )}

          <Field label="Within (km)" htmlFor="wish-distance">
            <Input
              id="wish-distance"
              type="number"
              min={1}
              max={500}
              value={distanceKm}
              onChange={(e) => setDistanceKm(e.target.value)}
            />
          </Field>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy} className="rounded-full">
              {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Add wish'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
