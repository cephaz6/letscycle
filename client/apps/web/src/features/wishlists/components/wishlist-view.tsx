'use client';

import { useState } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { useWishlist, type WishlistItem } from '@letscycle/api-client';
import { Button, Skeleton, Text } from '@letscycle/ui';
import { WishlistFormDialog } from './wishlist-form-dialog';
import { WishlistItemCard } from './wishlist-item-card';

export function WishlistView() {
  const { data, isLoading, isError } = useWishlist();
  const items = data ?? [];
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WishlistItem | undefined>(undefined);

  function openCreate() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  function openEdit(item: WishlistItem) {
    setEditing(item);
    setDialogOpen(true);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Wanted</h1>
        {items.length > 0 && (
          <Button className="rounded-full" onClick={openCreate}>
            <Plus className="size-4" /> New wish
          </Button>
        )}
      </div>
      <Text muted className="mb-5 text-sm">
        Tell us what you’re after and we’ll notify you when a match is posted nearby.
      </Text>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <Empty title="Couldn’t load your wishes" subtitle="Please try again shortly." />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <Sparkles className="size-10 text-muted-foreground" />
          <div>
            <p className="font-semibold">No wishes yet</p>
            <Text muted className="mx-auto mt-1 max-w-xs text-sm">
              Add what you’re looking for and get a heads-up the moment something matching
              lands near you.
            </Text>
          </div>
          <Button className="mt-1 rounded-full" onClick={openCreate}>
            <Plus className="size-4" /> Add your first wish
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <WishlistItemCard key={item.id} item={item} onEdit={openEdit} />
          ))}
        </ul>
      )}

      <WishlistFormDialog
        item={editing}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}

function Empty({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-16 text-center">
      <p className="font-semibold">{title}</p>
      <Text muted className="max-w-xs text-sm">
        {subtitle}
      </Text>
    </div>
  );
}
