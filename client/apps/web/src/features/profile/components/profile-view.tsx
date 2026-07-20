'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BadgeCheck,
  CalendarDays,
  Check,
  Download,
  Gift,
  ImagePlus,
  LogOut,
  Mail,
  MapPin,
  Package,
  Pencil,
  Phone,
  Plus,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react';
import {
  useListings,
  usersApi,
  type ListingSummary,
  type MyProfile,
} from '@letscycle/api-client';
import { Badge, Button, buttonVariants, cn, Skeleton, Text } from '@letscycle/ui';
import { ListingCard } from '@/features/listings/components/listing-card';
import { useAuth, useSignOut } from '@/features/auth';
import { AvatarUpload } from './avatar-upload';
import { EditProfileDialog } from './edit-profile-dialog';

const TABS = ['Listings', 'Reviews', 'About'] as const;
type Tab = (typeof TABS)[number];

export function ProfileView() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('Listings');
  const [editing, setEditing] = useState(false);

  const listings = useListings(user ? { sellerId: user.id, limit: 40 } : {});
  const items = listings.data?.items ?? [];
  const giveaways = useMemo(
    () => items.filter((l) => l.listingType === 'giveaway').length,
    [items],
  );

  if (!user) return null;

  const verified = Boolean(user.emailVerifiedAt);
  const joined = new Date(user.createdAt);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Hero */}
      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="relative h-32 bg-linear-to-br from-primary via-primary/85 to-emerald-600 sm:h-44">
          <div className="absolute -right-10 -top-16 size-56 rounded-full bg-white/10" />
          <div className="absolute right-28 top-8 size-24 rounded-full bg-white/10" />
          <div className="absolute -bottom-10 left-16 size-40 rounded-full bg-black/5" />
        </div>

        <div className="px-5 pb-6 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="-mt-14 sm:-mt-16">
                <AvatarUpload className="size-28" />
              </div>
              <div className="pb-1">
                <h1 className="text-2xl font-bold tracking-tight">{user.displayName}</h1>
                <p className="text-sm text-muted-foreground">
                  @{user.email.split('@')[0]}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Chip icon={<MapPin className="size-3.5" />}>Liverpool, UK</Chip>
                  <Chip icon={<CalendarDays className="size-3.5" />}>
                    Joined{' '}
                    {joined.toLocaleDateString('en-GB', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Chip>
                  <Chip icon={<ShieldCheck className="size-3.5" />}>
                    {verified ? 'Verified member' : 'Member'}
                  </Chip>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              className="shrink-0 rounded-full"
              onClick={() => setEditing(true)}
            >
              <Pencil className="size-4" /> Edit profile
            </Button>
          </div>

          {/* Stats bar */}
          <div className="mt-6 grid grid-cols-2 rounded-2xl border border-border bg-muted/30 sm:grid-cols-4 sm:divide-x sm:divide-border">
            <Stat icon={<Package />} label="Listings" value={String(items.length)} />
            <Stat icon={<Gift />} label="Given away" value={String(giveaways)} />
            <Stat icon={<Star />} label="Rating" value="New" />
            <Stat
              icon={<CalendarDays />}
              label="Member since"
              value={String(joined.getFullYear())}
            />
          </div>
        </div>
      </section>

      {/* Body */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* Main */}
        <div>
          <div className="border-b border-border">
            <div className="flex gap-6">
              {TABS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={cn(
                    '-mb-px border-b-2 pb-3 text-sm font-medium transition-colors',
                    tab === t
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-6">
            {tab === 'Listings' && (
              <ListingsTab loading={listings.isLoading} items={items} />
            )}
            {tab === 'Reviews' && (
              <EmptyState
                icon={<Star className="size-7" />}
                title="No reviews yet"
                subtitle="Reviews from buyers and sellers appear here after your first completed swap."
              />
            )}
            {tab === 'About' && <AboutTab user={user} />}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <CompletenessCard user={user} hasListing={items.length > 0} />
          <VerificationCard user={user} />
          <PrivacyCard />
        </aside>
      </div>

      <EditProfileDialog user={user} open={editing} onClose={() => setEditing(false)} />
    </div>
  );
}

function Chip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
      {icon}
      {children}
    </span>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary [&_svg]:size-4">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-lg font-bold leading-tight tracking-tight">
          {value}
        </span>
        <span className="block truncate text-xs text-muted-foreground">{label}</span>
      </span>
    </div>
  );
}

function ListingsTab({ loading, items }: { loading: boolean; items: ListingSummary[] }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-square w-full rounded-xl" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ))}
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Package className="size-7" />}
        title="No listings yet"
        subtitle="List something you no longer need — it only takes a minute."
        action={
          <Link href="/sell" className={cn(buttonVariants(), 'rounded-full')}>
            <Plus className="size-4" /> Start selling
          </Link>
        }
      />
    );
  }
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}

function AboutTab({ user }: { user: MyProfile }) {
  return (
    <dl className="max-w-md divide-y divide-border overflow-hidden rounded-2xl border border-border">
      <Row icon={<Mail className="size-4" />} label="Email">
        <span className="flex items-center gap-1.5">
          {user.email}
          {user.emailVerifiedAt && <BadgeCheck className="size-4 text-success" />}
        </span>
      </Row>
      <Row icon={<Phone className="size-4" />} label="Phone">
        {user.phone ?? <span className="text-muted-foreground">Not added</span>}
      </Row>
      <Row icon={<CalendarDays className="size-4" />} label="Member since">
        {new Date(user.createdAt).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </Row>
    </dl>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 bg-card px-4 py-3 text-sm">
      <dt className="flex items-center gap-2 text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

function CompletenessCard({
  user,
  hasListing,
}: {
  user: MyProfile;
  hasListing: boolean;
}) {
  const steps = [
    { label: 'Verify your email', done: Boolean(user.emailVerifiedAt), icon: Mail },
    { label: 'Add a phone number', done: Boolean(user.phone), icon: Phone },
    { label: 'Add a profile photo', done: Boolean(user.avatarUrl), icon: ImagePlus },
    { label: 'Post your first listing', done: hasListing, icon: Package },
  ];
  const done = steps.filter((s) => s.done).length;
  const pct = Math.round((done / steps.length) * 100);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <Sparkles className="size-4 text-primary" /> Complete your profile
        </h3>
        <span className="text-sm font-bold text-primary">{pct}%</span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-linear-to-r from-primary to-emerald-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <ul className="mt-4 space-y-2.5">
        {steps.map((s) => (
          <li key={s.label} className="flex items-center gap-2.5 text-sm">
            <span
              className={cn(
                'grid size-5 shrink-0 place-items-center rounded-full',
                s.done
                  ? 'bg-success text-success-foreground'
                  : 'border border-border text-muted-foreground',
              )}
            >
              {s.done ? <Check className="size-3.5" /> : <s.icon className="size-3" />}
            </span>
            <span className={cn(s.done && 'text-muted-foreground line-through')}>
              {s.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function VerificationCard({ user }: { user: MyProfile }) {
  const emailVerified = Boolean(user.emailVerifiedAt);
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h3 className="text-sm font-semibold">Verification</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Verified members earn more trust and sell faster.
      </p>
      <ul className="mt-3 space-y-2 text-sm">
        <li className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Mail className="size-4 text-muted-foreground" /> Email
          </span>
          {emailVerified ? (
            <Badge variant="success" className="gap-1">
              <BadgeCheck className="size-3.5" /> Verified
            </Badge>
          ) : (
            <Badge variant="muted">Pending</Badge>
          )}
        </li>
        <li className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Phone className="size-4 text-muted-foreground" /> Phone
          </span>
          <Badge variant="outline">{user.phone ? 'Added' : 'Add'}</Badge>
        </li>
      </ul>
    </div>
  );
}

function PrivacyCard() {
  const router = useRouter();
  const signOut = useSignOut();
  const [exporting, setExporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function onExport() {
    setExporting(true);
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
      setExporting(false);
    }
  }

  async function onDelete() {
    setDeleting(true);
    try {
      await usersApi.deleteMe();
      await signOut();
      router.push('/');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h3 className="text-sm font-semibold">Account &amp; privacy</h3>
      <div className="mt-3 space-y-1">
        <button
          type="button"
          onClick={onExport}
          disabled={exporting}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-accent"
        >
          <Download className="size-4 text-muted-foreground" />
          {exporting ? 'Preparing…' : 'Download my data'}
        </button>
        <button
          type="button"
          onClick={() => void signOut()}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-accent"
        >
          <LogOut className="size-4 text-muted-foreground" /> Sign out
        </button>

        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
          >
            <Trash2 className="size-4" /> Delete account
          </button>
        ) : (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-sm font-medium text-destructive">Delete your account?</p>
            <Text muted className="mt-1 text-xs">
              This permanently erases your personal data. This can’t be undone.
            </Text>
            <div className="mt-3 flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                className="rounded-full"
                disabled={deleting}
                onClick={onDelete}
              >
                {deleting ? 'Deleting…' : 'Yes, delete'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </span>
      <p className="font-semibold">{title}</p>
      <Text muted className="max-w-xs text-sm">
        {subtitle}
      </Text>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
