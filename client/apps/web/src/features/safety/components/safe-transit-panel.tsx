'use client';

import { useState } from 'react';
import { Check, MapPin, ShieldAlert, ShieldCheck, Share2, UserCheck } from 'lucide-react';
import {
  useSafeTransitSession,
  useStartSafeTransit,
  useUpdateSafeTransit,
} from '@letscycle/api-client';
import { Button, Text, cn } from '@letscycle/ui';

/**
 * Safety signals for the trip to a handover: share your location, tell a
 * trusted contact, confirm you arrived, or raise duress. Offered while an order
 * is being collected.
 */
export function SafeTransitPanel({ transactionId }: { transactionId: string }) {
  const { data: session } = useSafeTransitSession(transactionId);
  const start = useStartSafeTransit(transactionId);
  const update = useUpdateSafeTransit(transactionId);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDuress, setConfirmingDuress] = useState(false);

  async function begin(): Promise<void> {
    setError(null);
    try {
      await start.mutateAsync({ liveLocationShareEnabled: true });
    } catch {
      setError('Couldn’t start safe transit. Please try again.');
    }
  }

  async function patch(input: Parameters<typeof update.mutateAsync>[0]['input']) {
    if (!session) return;
    setError(null);
    try {
      await update.mutateAsync({ sessionId: session.id, input });
    } catch {
      setError('Couldn’t update the session. Please try again.');
    }
  }

  if (!session || session.endedAt) {
    return (
      <div className="mt-3 rounded-xl border border-border bg-muted/40 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="size-5 text-primary" /> Travelling to collect?
        </p>
        <Text muted className="mt-1 text-sm">
          {session?.endedAt
            ? 'Your last safe-transit session has ended.'
            : 'Start safe transit to share your trip and get one-tap help if something feels off.'}
        </Text>
        <Button
          className="mt-3 rounded-full"
          size="sm"
          disabled={start.isPending}
          onClick={() => void begin()}
        >
          <ShieldCheck className="size-4" />
          {start.isPending ? 'Starting…' : 'Start safe transit'}
        </Button>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  const arrived = Boolean(session.arrivalConfirmedAt);
  const duress = Boolean(session.duressTriggeredAt);

  return (
    <div
      className={cn(
        'mt-3 rounded-xl border p-4',
        duress ? 'border-destructive bg-destructive/5' : 'border-primary/40 bg-primary/5',
      )}
    >
      <p className="flex items-center gap-2 text-sm font-semibold">
        <ShieldCheck className="size-5 text-primary" /> Safe transit active
      </p>

      {duress && (
        <p className="mt-2 flex items-start gap-2 text-sm font-medium text-destructive">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          Duress raised — our team has been alerted. If you’re in danger, call 999.
        </p>
      )}

      <ul className="mt-3 space-y-2">
        <SignalRow
          icon={<Share2 className="size-4" />}
          label="Sharing my live location"
          active={session.liveLocationShareEnabled}
          disabled={update.isPending}
          onToggle={(next) => void patch({ liveLocationShareEnabled: next })}
        />
        <SignalRow
          icon={<UserCheck className="size-4" />}
          label="Trusted contact notified"
          active={session.trustedContactNotified}
          disabled={update.isPending}
          onToggle={(next) => void patch({ trustedContactNotified: next })}
        />
      </ul>

      <div className="mt-4 flex flex-wrap gap-2">
        {arrived ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Check className="size-4 text-primary" /> Arrival confirmed
          </span>
        ) : (
          <Button
            size="sm"
            className="rounded-full"
            disabled={update.isPending}
            onClick={() => void patch({ confirmArrival: true })}
          >
            <MapPin className="size-4" /> I’ve arrived
          </Button>
        )}

        <Button
          size="sm"
          variant="ghost"
          className="rounded-full"
          disabled={update.isPending}
          onClick={() => void patch({ end: true })}
        >
          End session
        </Button>

        {!duress &&
          (confirmingDuress ? (
            <span className="flex items-center gap-2">
              <Button
                size="sm"
                variant="destructive"
                className="rounded-full"
                disabled={update.isPending}
                onClick={() => void patch({ triggerDuress: true })}
              >
                <ShieldAlert className="size-4" /> Confirm — send alert
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-full"
                onClick={() => setConfirmingDuress(false)}
              >
                Cancel
              </Button>
            </span>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="ml-auto rounded-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setConfirmingDuress(true)}
            >
              <ShieldAlert className="size-4" /> I need help
            </Button>
          ))}
      </div>

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}

function SignalRow({
  icon,
  label,
  active,
  disabled,
  onToggle,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  disabled?: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <li className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={active}
        aria-label={label}
        disabled={disabled}
        onClick={() => onToggle(!active)}
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50',
          active ? 'bg-primary' : 'bg-muted-foreground/30',
        )}
      >
        <span
          className={cn(
            'absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow transition-transform',
            active ? 'translate-x-4' : 'translate-x-0',
          )}
        />
      </button>
    </li>
  );
}
