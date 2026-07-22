'use client';

import { useState } from 'react';
import { Check, Star } from 'lucide-react';
import { useMyReviews, usePublicProfile } from '@letscycle/api-client';
import { Button } from '@letscycle/ui';
import { ReviewFormDialog } from './review-form-dialog';

/**
 * Review CTA for a completed order — shown wherever the transaction is, so it's
 * offered at the point of completion rather than only on the other party's
 * profile. Collapses to a confirmation once reviewed.
 */
export function LeaveReviewButton({
  transactionId,
  counterpartyId,
  size = 'sm',
}: {
  transactionId: string;
  counterpartyId: string;
  size?: 'sm' | 'md';
}) {
  const { data: reviews } = useMyReviews();
  const { data: person } = usePublicProfile(counterpartyId);
  const [open, setOpen] = useState(false);

  const alreadyReviewed = (reviews?.given ?? []).some(
    (r) => r.transactionId === transactionId,
  );

  if (alreadyReviewed) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <Check className="size-4 text-primary" /> Review left
      </span>
    );
  }

  return (
    <>
      <Button size={size} className="rounded-full" onClick={() => setOpen(true)}>
        <Star className="size-4" /> Leave a review
      </Button>
      <ReviewFormDialog
        revieweeUserId={counterpartyId}
        revieweeName={person?.displayName ?? 'them'}
        transactionId={transactionId}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
