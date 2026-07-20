'use client';

import { useState } from 'react';
import { MapPin, Pause, Pencil, Play, Tag, Trash2 } from 'lucide-react';
import {
  useCategories,
  useDeleteWishlistItem,
  useUpdateWishlistItem,
  type WishlistItem,
} from '@letscycle/api-client';
import { Badge, Button } from '@letscycle/ui';

const TYPE_LABEL: Record<WishlistItem['listingTypePreference'], string> = {
  both: 'Any',
  sell: 'For sale',
  giveaway: 'Giveaway',
};

export function WishlistItemCard({
  item,
  onEdit,
}: {
  item: WishlistItem;
  onEdit: (item: WishlistItem) => void;
}) {
  const { data: categories } = useCategories();
  const update = useUpdateWishlistItem();
  const remove = useDeleteWishlistItem();
  const [confirming, setConfirming] = useState(false);

  const categoryName = categories?.find((c) => c.id === item.categoryId)?.name;
  const paused = item.status === 'paused';

  function togglePause() {
    void update.mutateAsync({
      id: item.id,
      input: { status: paused ? 'active' : 'paused' },
    });
  }

  return (
    <li className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <Tag className="size-4 text-primary" />
              {categoryName ?? 'Any category'}
            </span>
            <Badge variant={paused ? 'muted' : 'success'}>
              {paused ? 'Paused' : 'Active'}
            </Badge>
            <Badge variant="outline">{TYPE_LABEL[item.listingTypePreference]}</Badge>
          </div>

          {item.keywords.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.keywords.map((k) => (
                <span key={k} className="rounded-full bg-muted px-2.5 py-0.5 text-xs">
                  {k}
                </span>
              ))}
            </div>
          )}

          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" /> within {item.maxDistanceKm} km
            </span>
            {item.maxPricePence != null && (
              <span>up to £{(item.maxPricePence / 100).toFixed(2)}</span>
            )}
          </p>
        </div>
      </div>

      {confirming ? (
        <div className="mt-3 flex items-center justify-end gap-2">
          <span className="mr-auto text-sm text-muted-foreground">Delete this wish?</span>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full"
            disabled={remove.isPending}
            onClick={() => setConfirming(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="rounded-full"
            disabled={remove.isPending}
            onClick={() => void remove.mutateAsync(item.id)}
          >
            {remove.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full"
            onClick={() => onEdit(item)}
          >
            <Pencil className="size-4" /> Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full"
            disabled={update.isPending}
            onClick={togglePause}
          >
            {paused ? (
              <>
                <Play className="size-4" /> Resume
              </>
            ) : (
              <>
                <Pause className="size-4" /> Pause
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto rounded-full text-destructive hover:text-destructive"
            onClick={() => setConfirming(true)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      )}
    </li>
  );
}
