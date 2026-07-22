'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Gift, ImagePlus, MapPin, Tag, X } from 'lucide-react';
import {
  listingsApi,
  uploadToPresignedUrl,
  useCategories,
  type ListingCondition,
} from '@letscycle/api-client';
import { Button, cn, Icon, Text } from '@letscycle/ui';
import { Field } from '@/features/auth/form-parts';

const MAX_PHOTOS = 6;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const CONDITIONS: { value: ListingCondition; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'likeNew', label: 'Like new' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
];

// Home-location picker (map) arrives with the profile/map step; until then
// new listings pin to the Liverpool city centre with a wide accuracy radius.
const DEFAULT_LOCATION = { lat: 53.4084, lng: -2.9916, accuracyMetres: 5000 };

interface PickedPhoto {
  file: File;
  previewUrl: string;
}

async function imageDimensions(file: File): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const dims = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return dims;
}

export function SellForm() {
  const router = useRouter();
  const { data: categories } = useCategories();

  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [condition, setCondition] = useState<ListingCondition>('good');
  const [giveaway, setGiveaway] = useState(false);
  const [price, setPrice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Revoke object URLs when previews change/unmount.
  useEffect(
    () => () => photos.forEach((p) => URL.revokeObjectURL(p.previewUrl)),
    [photos],
  );

  const pricePence = useMemo(() => {
    const parsed = Number.parseFloat(price);
    return Number.isFinite(parsed) ? Math.round(parsed * 100) : NaN;
  }, [price]);

  function addPhotos(files: FileList | null) {
    if (!files) return;
    setError(null);
    const next: PickedPhoto[] = [];
    for (const file of Array.from(files)) {
      if (!PHOTO_TYPES.includes(file.type)) {
        setError('Photos must be JPEG, PNG or WebP.');
        continue;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        setError('Each photo must be under 5 MB.');
        continue;
      }
      next.push({ file, previewUrl: URL.createObjectURL(file) });
    }
    setPhotos((prev) => [...prev, ...next].slice(0, MAX_PHOTOS));
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  const busy = status !== null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!categoryId) return setError('Pick a category.');
    if (!giveaway && (!Number.isFinite(pricePence) || pricePence <= 0)) {
      return setError('Enter a price, or mark the item as a giveaway.');
    }

    try {
      setStatus('Creating listing…');
      const listing = await listingsApi.create({
        title: title.trim(),
        description: description.trim(),
        categoryId,
        condition,
        listingType: giveaway ? 'giveaway' : 'sell',
        pricePence: giveaway ? null : pricePence,
        location: DEFAULT_LOCATION,
      });

      for (const [i, photo] of photos.entries()) {
        setStatus(`Uploading photo ${i + 1} of ${photos.length}…`);
        const { width, height } = await imageDimensions(photo.file);
        const ticket = await listingsApi.requestPhotoUpload(listing.id, {
          contentType: photo.file.type as 'image/jpeg' | 'image/png' | 'image/webp',
          sizeBytes: photo.file.size,
          width,
          height,
          displayOrder: i,
        });
        await uploadToPresignedUrl(ticket, photo.file);
        await listingsApi.confirmPhoto(listing.id, ticket.photoId);
      }

      setStatus('Publishing…');
      await listingsApi.update(listing.id, { status: 'active' });
      router.push(`/listings/${listing.id}`);
    } catch {
      setStatus(null);
      setError('Something went wrong while publishing. Please try again.');
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Photos */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Camera className="size-4 text-primary" /> Photos
          <span className="font-normal text-muted-foreground">
            · {photos.length}/{MAX_PHOTOS} — first photo is the cover
          </span>
        </h2>
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {photos.map((photo, i) => (
            <div
              key={photo.previewUrl}
              className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
              <img
                src={photo.previewUrl}
                alt={`Photo ${i + 1}`}
                className="h-full w-full object-cover"
              />
              {i === 0 && (
                <span className="absolute left-1.5 top-1.5 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                  Cover
                </span>
              )}
              <button
                type="button"
                aria-label={`Remove photo ${i + 1}`}
                onClick={() => removePhoto(i)}
                className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-background/90 text-foreground opacity-0 shadow transition-opacity group-hover:opacity-100"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="grid aspect-square place-items-center rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <span className="flex flex-col items-center gap-1 text-xs font-medium">
                <ImagePlus className="size-6" /> Add
              </span>
            </button>
          )}
        </div>
        <input
          ref={fileInput}
          type="file"
          accept={PHOTO_TYPES.join(',')}
          multiple
          hidden
          onChange={(e) => {
            addPhotos(e.target.files);
            e.target.value = '';
          }}
        />
      </section>

      {/* Details */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold">Details</h2>

        <Field label="Title" htmlFor="title">
          <input
            id="title"
            required
            maxLength={140}
            placeholder="What are you listing?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </Field>

        <Field label="Description" htmlFor="description">
          <textarea
            id="description"
            required
            rows={4}
            maxLength={5000}
            placeholder="Condition details, dimensions, pickup notes…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </Field>

        <Field label="Category" htmlFor="category">
          <select
            id="category"
            required
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="" disabled>
              Choose a category
            </option>
            {(categories ?? []).map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </Field>

        <div>
          <span className="mb-1.5 block text-sm font-medium">Condition</span>
          <div className="flex flex-wrap gap-2">
            {CONDITIONS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCondition(c.value)}
                className={cn(
                  'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                  condition === c.value
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-foreground hover:bg-accent',
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Price */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold">Price</h2>
        <div className="grid grid-cols-2 gap-3">
          <TypeCard
            active={!giveaway}
            onClick={() => setGiveaway(false)}
            icon={<Tag className="size-5" />}
            title="Sell"
            subtitle="Set your price"
          />
          <TypeCard
            active={giveaway}
            onClick={() => setGiveaway(true)}
            icon={<Gift className="size-5" />}
            title="Give away"
            subtitle="Free to a good home"
          />
        </div>

        {!giveaway && (
          <Field label="Price (£)" htmlFor="price">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                £
              </span>
              <input
                id="price"
                inputMode="decimal"
                required
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background pl-7 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </Field>
        )}

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="size-3.5" /> Pickup around Liverpool city centre — a precise
          location picker arrives with the map feature.
        </p>
      </section>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        {status && (
          <Text muted className="flex items-center gap-2 text-sm">
            <Icon name="Loader" className="size-4 animate-spin" /> {status}
          </Text>
        )}
        <Button type="submit" size="lg" className="rounded-full" disabled={busy}>
          {busy ? 'Publishing…' : 'Publish listing'}
        </Button>
      </div>
    </form>
  );
}

function TypeCard({
  active,
  onClick,
  icon,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-xl border p-4 text-left transition-colors',
        active
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'border-border hover:bg-accent/50',
      )}
    >
      <span
        className={cn(
          'grid size-10 shrink-0 place-items-center rounded-full',
          active
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground',
        )}
      >
        {icon}
      </span>
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-muted-foreground">{subtitle}</span>
      </span>
    </button>
  );
}
