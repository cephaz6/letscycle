'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { ApiError, useSubmitReview } from '@letscycle/api-client';
import { Button } from '@letscycle/ui';
import { StarRating } from '@/components/star-rating';

export function ReviewFormDialog({
  revieweeUserId,
  revieweeName,
  transactionId,
  open,
  onClose,
}: {
  revieweeUserId: string;
  revieweeName: string;
  transactionId: string;
  open: boolean;
  onClose: () => void;
}) {
  const submit = useSubmitReview(revieweeUserId);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setRating(0);
    setComment('');
    setError(null);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (rating < 1) return setError('Pick a star rating.');
    try {
      await submit.mutateAsync({
        transactionId,
        rating,
        comment: comment.trim() || null,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 400
          ? 'You’ve already reviewed this sale.'
          : 'Couldn’t submit your review. Please try again.',
      );
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
        aria-label={`Review ${revieweeName}`}
        className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Review {revieweeName}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full hover:bg-accent"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="flex flex-col items-center gap-2 py-2">
            <StarRating value={rating} onChange={setRating} size="lg" />
            <p className="text-sm text-muted-foreground">
              {rating > 0 ? `${rating} out of 5` : 'Tap to rate'}
            </p>
          </div>

          <textarea
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={2000}
            placeholder="Share how the sale went (optional)…"
            className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submit.isPending} className="rounded-full">
              {submit.isPending ? 'Submitting…' : 'Submit review'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
