'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button, Text } from '@letscycle/ui';

export interface ExplainerStep {
  title: string;
  body: string;
}

/**
 * Shown the first time someone commits to buying or claiming, because both
 * flows surprise people: "Buy now" doesn't charge you, and a giveaway is
 * claimed by messaging rather than checkout. Explaining at the moment of the
 * click beats a help page nobody opens.
 */
export function ActionExplainerDialog({
  open,
  title,
  lead,
  steps,
  reassurance,
  confirmLabel,
  pending,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  lead: string;
  steps: ExplainerStep[];
  reassurance?: string;
  confirmLabel: string;
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

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
        aria-label={title}
        className="relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl"
      >
        <div className="mb-1 flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="-mr-1 -mt-1 grid size-8 shrink-0 place-items-center rounded-full hover:bg-accent"
          >
            <X className="size-5" />
          </button>
        </div>
        <Text muted className="text-sm">
          {lead}
        </Text>

        <ol className="mt-4 space-y-3">
          {steps.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{step.title}</span>
                <span className="block text-sm text-muted-foreground">{step.body}</span>
              </span>
            </li>
          ))}
        </ol>

        {reassurance && (
          <p className="mt-4 rounded-lg bg-primary/10 px-3 py-2 text-sm text-foreground">
            {reassurance}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" className="rounded-full" onClick={onClose}>
            Cancel
          </Button>
          <Button className="rounded-full" disabled={pending} onClick={onConfirm}>
            {pending ? 'Just a moment…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
