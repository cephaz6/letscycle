'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Banknote,
  Bell,
  Check,
  Download,
  Loader,
  MapPin,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import {
  usePayoutStatus,
  useOnboardPayouts,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  usersApi,
  type HomeLocation,
  type NotificationType,
} from '@letscycle/api-client';
import { Badge, Button, cn, Input, Text } from '@letscycle/ui';
import { useAuth, useAuthStore, useSignOut } from '@/features/auth';
import { Field } from '@/features/auth/form-parts';
import { LocationPicker } from '@/components/location-picker';

/** In-app defaults when the user has no stored preference for a type. */
const NOTIFICATION_ROWS: { type: NotificationType; label: string; hint: string }[] = [
  { type: 'matchFound', label: 'Matches', hint: 'An item matching a wish is posted' },
  { type: 'messageReceived', label: 'Messages', hint: 'Someone messages you' },
  { type: 'transactionUpdate', label: 'Orders', hint: 'Updates on a buy or sale' },
  { type: 'reviewReceived', label: 'Reviews', hint: 'Someone reviews you' },
  { type: 'system', label: 'Announcements', hint: 'Service notices from LetsCycle' },
];

export function SettingsView() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      <Text muted className="mb-6 mt-1 text-sm">
        Notifications, search defaults, payouts and your data.
      </Text>

      <div className="space-y-4">
        <HomeLocationSection />
        <NotificationsSection />
        <SearchDefaultsSection />
        <PayoutsSection />
        <DataSection />
        <DangerZone />
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary [&_svg]:size-4">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{title}</h2>
          <Text muted className="text-sm">
            {subtitle}
          </Text>
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </section>
  );
}

function Toggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-muted-foreground/30',
      )}
    >
      <span
        className={cn(
          // Anchored left, then slid across — without `left` the knob would sit
          // at its static (centred) position inside the button.
          'absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  );
}

function NotificationsSection() {
  const { data: prefs, isLoading } = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();

  // A type with no stored preference falls back to the server defaults, which
  // include inApp for every type — so treat "missing" as on.
  function isOn(type: NotificationType): boolean {
    const channels = prefs?.[type];
    return channels ? channels.includes('inApp') : true;
  }

  function toggle(type: NotificationType, next: boolean) {
    const existing = prefs?.[type] ?? ['inApp'];
    // Preserve webPush so enabling it later (with the PWA) isn't lost here.
    const channels = next
      ? Array.from(new Set([...existing, 'inApp' as const]))
      : existing.filter((c) => c !== 'inApp');
    update.mutate({ [type]: channels });
  }

  return (
    <Section
      icon={<Bell />}
      title="Notifications"
      subtitle="Choose what shows up in your in-app feed."
    >
      {isLoading ? (
        <Text muted className="text-sm">
          Loading…
        </Text>
      ) : (
        <ul className="divide-y divide-border">
          {NOTIFICATION_ROWS.map((row) => (
            <li key={row.type} className="flex items-center gap-3 py-3 first:pt-0">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{row.label}</span>
                <span className="block text-xs text-muted-foreground">{row.hint}</span>
              </span>
              <Toggle
                label={row.label}
                checked={isOn(row.type)}
                onChange={(next) => toggle(row.type, next)}
              />
            </li>
          ))}
        </ul>
      )}
      <Text muted className="mt-3 text-xs">
        Push notifications arrive when the installable app ships.
      </Text>
    </Section>
  );
}

/**
 * Matching only considers members with a home location (the candidate query
 * requires one), so this is what makes wishlist alerts and distance search work.
 */
function HomeLocationSection() {
  const { user } = useAuth();
  const setUser = useAuthStore((s) => s.setUser);
  const [draft, setDraft] = useState<HomeLocation | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(user?.homeLocation ?? null);
  }, [user]);

  const dirty =
    draft !== null &&
    (draft.lat !== user?.homeLocation?.lat || draft.lng !== user?.homeLocation?.lng);

  async function save() {
    if (!draft) return;
    setError(null);
    setSaving(true);
    try {
      const updated = await usersApi.updateMe({ homeLocation: draft });
      setUser(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError('Couldn’t save your location. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section
      icon={<MapPin />}
      title="Home location"
      subtitle="Roughly where you are, so we can match and sort by distance."
    >
      {!user?.homeLocation && (
        <p className="mb-3 rounded-lg bg-warning/10 px-3 py-2 text-sm text-foreground">
          Set this to start getting wishlist match alerts — they only go to members with a
          location.
        </p>
      )}
      <LocationPicker value={draft} onChange={setDraft} />
      <div className="mt-3 flex items-center gap-3">
        <Button
          className="rounded-full"
          disabled={!dirty || saving}
          onClick={() => void save()}
        >
          {saved ? <Check className="size-4" /> : null}
          {saving ? 'Saving…' : saved ? 'Saved' : 'Save location'}
        </Button>
        <span className="text-xs text-muted-foreground">
          Only an approximate area is ever shared.
        </span>
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </Section>
  );
}

function SearchDefaultsSection() {
  const { user } = useAuth();
  const setUser = useAuthStore((s) => s.setUser);
  const [distance, setDistance] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDistance(user?.preferences?.defaultDistanceKm?.toString() ?? '10');
  }, [user]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const km = Number.parseInt(distance, 10);
    if (!Number.isFinite(km) || km < 1 || km > 500) {
      return setError('Enter a distance between 1 and 500 km.');
    }
    setError(null);
    setSaving(true);
    try {
      const updated = await usersApi.updateMe({
        preferences: { ...user?.preferences, defaultDistanceKm: km },
      });
      setUser(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError('Couldn’t save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section
      icon={<SlidersHorizontal />}
      title="Search defaults"
      subtitle="How far around Liverpool to look by default."
    >
      <form onSubmit={(e) => void save(e)} className="flex items-end gap-2">
        <div className="flex-1">
          <Field label="Distance (km)" htmlFor="default-distance">
            <Input
              id="default-distance"
              type="number"
              min={1}
              max={500}
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
            />
          </Field>
        </div>
        <Button type="submit" disabled={saving} className="rounded-full">
          {saved ? <Check className="size-4" /> : null}
          {saving ? 'Saving…' : saved ? 'Saved' : 'Save'}
        </Button>
      </form>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </Section>
  );
}

function PayoutsSection() {
  const { data: status, isLoading } = usePayoutStatus();
  const onboard = useOnboardPayouts();
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setError(null);
    try {
      const { url } = await onboard.mutateAsync();
      window.location.href = url;
    } catch {
      setError('Couldn’t start payouts onboarding. Please try again.');
    }
  }

  return (
    <Section
      icon={<Banknote />}
      title="Payouts"
      subtitle="Get paid when your items sell."
    >
      {isLoading ? (
        <Text muted className="text-sm">
          Loading…
        </Text>
      ) : status?.payoutsEnabled ? (
        <Badge variant="success" className="gap-1">
          <Check className="size-3.5" /> Payouts enabled
        </Badge>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="muted">
            {status?.onboardingStatus === 'restricted' ? 'Action needed' : 'Not set up'}
          </Badge>
          <Button
            className="rounded-full"
            disabled={onboard.isPending}
            onClick={() => void start()}
          >
            {onboard.isPending ? (
              <>
                <Loader className="size-4 animate-spin" /> Opening…
              </>
            ) : (
              'Set up payouts'
            )}
          </Button>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </Section>
  );
}

function DataSection() {
  const [busy, setBusy] = useState(false);

  async function exportData() {
    setBusy(true);
    try {
      const data = await usersApi.exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'letscycle-my-data.json';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section
      icon={<Download />}
      title="Your data"
      subtitle="Download everything we hold about you (GDPR)."
    >
      <Button
        variant="outline"
        className="rounded-full"
        disabled={busy}
        onClick={() => void exportData()}
      >
        <Download className="size-4" />
        {busy ? 'Preparing…' : 'Download my data'}
      </Button>
    </Section>
  );
}

function DangerZone() {
  const router = useRouter();
  const signOut = useSignOut();
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteAccount() {
    setBusy(true);
    setError(null);
    try {
      await usersApi.deleteMe();
      await signOut();
      router.push('/');
    } catch {
      setError('Couldn’t delete your account. Please try again.');
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive [&_svg]:size-4">
          <AlertTriangle />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-destructive">Delete account</h2>
          <Text muted className="text-sm">
            Permanently deletes your account and anonymises your data. Your completed
            orders stay on the other party’s record. This can’t be undone.
          </Text>

          {confirming ? (
            <div className="mt-4 space-y-3">
              <Field label="Type DELETE to confirm" htmlFor="confirm-delete">
                <Input
                  id="confirm-delete"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                />
              </Field>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  className="rounded-full"
                  disabled={busy}
                  onClick={() => {
                    setConfirming(false);
                    setConfirmText('');
                    setError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="rounded-full"
                  disabled={busy || confirmText !== 'DELETE'}
                  onClick={() => void deleteAccount()}
                >
                  <Trash2 className="size-4" />
                  {busy ? 'Deleting…' : 'Delete my account'}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="mt-4 rounded-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setConfirming(true)}
            >
              <Trash2 className="size-4" /> Delete account
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
