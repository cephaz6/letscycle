'use client';

import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { resolveImageUrl, type ListingPhoto } from '@letscycle/api-client';
import { cn } from '@letscycle/ui';

export function ListingGallery({
  photos,
  title,
}: {
  photos: ListingPhoto[];
  title: string;
}) {
  const [active, setActive] = useState(0);
  const images = photos
    .map((p) => resolveImageUrl(p.key))
    .filter((src): src is string => Boolean(src));

  if (images.length === 0) {
    return (
      <div className="grid aspect-square w-full place-items-center rounded-xl bg-muted text-muted-foreground">
        <ImageOff className="size-10" />
      </div>
    );
  }

  const main = images[Math.min(active, images.length - 1)];

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row">
      {images.length > 1 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto sm:flex-col">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1}`}
              aria-current={i === active}
              className={cn(
                'size-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors',
                i === active ? 'border-primary' : 'border-transparent hover:border-border',
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- remote demo photos */}
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-hidden rounded-xl bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element -- remote demo photos */}
        <img
          src={main}
          alt={title}
          className="aspect-square w-full object-cover sm:aspect-4/3"
        />
      </div>
    </div>
  );
}
