'use client';

import Link from 'next/link';
import { MessageSquareText } from 'lucide-react';
import { useUserReviews } from '@letscycle/api-client';
import { Skeleton, Text } from '@letscycle/ui';
import { Avatar } from '@/components/avatar';
import { StarRating } from '@/components/star-rating';
import { formatPostedAt } from '@/features/listings/format';

export function ReviewsList({ userId }: { userId: string }) {
  const { data, isLoading, isError } = useUserReviews(userId);
  const reviews = data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Text muted className="text-sm">
        Couldn’t load reviews right now.
      </Text>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-12 text-center">
        <MessageSquareText className="size-8 text-muted-foreground" />
        <p className="font-semibold">No reviews yet</p>
        <Text muted className="max-w-xs text-sm">
          Reviews appear here after a completed sale.
        </Text>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {reviews.map((r) => (
        <li key={r.id} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <Link href={`/u/${r.reviewer.id}`} className="shrink-0">
              <Avatar
                name={r.reviewer.displayName}
                avatarUrl={r.reviewer.avatarUrl}
                className="size-10 text-xs"
              />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <Link
                  href={`/u/${r.reviewer.id}`}
                  className="truncate font-semibold hover:underline"
                >
                  {r.reviewer.displayName}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {formatPostedAt(r.createdAt)}
                </span>
              </div>
              <StarRating value={r.rating} size="sm" className="mt-0.5" />
              {r.comment && (
                <p className="mt-2 whitespace-pre-line text-sm text-foreground/90">
                  {r.comment}
                </p>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
