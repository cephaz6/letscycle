import { resolveImageUrl } from '@letscycle/api-client';
import { cn } from '@letscycle/ui';

function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/** Round avatar: shows the photo when present, else gradient initials.
 *  Pass size + text size via className (e.g. "size-10 text-sm"). */
export function Avatar({
  name,
  avatarUrl,
  className,
}: {
  name: string;
  avatarUrl?: string | null;
  className?: string;
}) {
  const src = resolveImageUrl(avatarUrl);

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- remote/media avatar
      <img
        src={src}
        alt={name}
        className={cn('rounded-full bg-muted object-cover', className)}
      />
    );
  }

  return (
    <span
      className={cn(
        'grid place-items-center rounded-full bg-linear-to-br from-primary to-emerald-600 font-bold text-primary-foreground',
        className,
      )}
    >
      {initials(name) || '·'}
    </span>
  );
}
