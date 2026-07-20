'use client';

import { Star } from 'lucide-react';
import { cn } from '@letscycle/ui';

/**
 * Star rating. Read-only by default; pass `onChange` to make it an input
 * (whole stars 1–5). For display, `value` may be fractional and rounds to the
 * nearest whole star for fill.
 */
export function StarRating({
  value,
  onChange,
  size = 'md',
  className,
}: {
  value: number;
  onChange?: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const interactive = Boolean(onChange);
  const filled = Math.round(value);
  const sizeClass = size === 'lg' ? 'size-7' : size === 'sm' ? 'size-4' : 'size-5';

  return (
    <div className={cn('inline-flex items-center gap-0.5', className)}>
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= filled;
        const StarEl = (
          <Star
            className={cn(
              sizeClass,
              isFilled
                ? 'fill-amber-400 text-amber-400'
                : 'fill-none text-muted-foreground/40',
            )}
          />
        );
        if (!interactive) return <span key={star}>{StarEl}</span>;
        return (
          <button
            key={star}
            type="button"
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
            onClick={() => onChange?.(star)}
            className="transition-transform hover:scale-110"
          >
            {StarEl}
          </button>
        );
      })}
    </div>
  );
}
