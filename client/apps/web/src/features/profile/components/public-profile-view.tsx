'use client';

import { BadgeCheck, CalendarDays, MapPin, Package } from 'lucide-react';
import { useListings, usePublicProfile } from '@letscycle/api-client';
import { Badge, Skeleton, Text } from '@letscycle/ui';
import { ListingCard } from '@/features/listings/components/listing-card';
import { useAuth } from '@/features/auth';

function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function PublicProfileView({ userId }: { userId: string }) {
  const { user } = useAuth();
  const { data: profile, isLoading, isError } = usePublicProfile(userId);
  const listings = useListings({ sellerId: userId, limit: 40 });
  const items = listings.data?.items ?? [];

  if (isLoading) return <ProfileSkeleton />;

  if (isError || !profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <p className="text-lg font-semibold">Profile not found</p>
        <Text muted className="mt-1 text-sm">
          This member may no longer be available.
        </Text>
      </div>
    );
  }

  const isMe = user?.id === profile.id;
  const memberSince = new Date(profile.memberSince);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Hero */}
      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="h-24 bg-linear-to-br from-primary via-primary/85 to-emerald-600 sm:h-28" />
        <div className="px-5 pb-5 sm:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="-mt-12 grid size-24 shrink-0 place-items-center rounded-full bg-linear-to-br from-primary to-emerald-600 text-2xl font-bold text-primary-foreground shadow-lg ring-4 ring-card">
                {initials(profile.displayName)}
              </div>
              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight">
                    {profile.displayName}
                  </h1>
                  {profile.isEmailVerified && (
                    <Badge variant="success" className="gap-1">
                      <BadgeCheck className="size-3.5" /> Verified
                    </Badge>
                  )}
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5" /> Liverpool, UK
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarDays className="size-3.5" /> Member since{' '}
                    {memberSince.toLocaleDateString('en-GB', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </p>
              </div>
            </div>
            {isMe && (
              <a
                href="/me"
                className="shrink-0 text-sm font-medium text-primary hover:underline"
              >
                This is you — edit profile
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Listings */}
      <h2 className="mb-4 mt-8 text-lg font-bold tracking-tight">
        Listings
        {!listings.isLoading && (
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {items.length}
          </span>
        )}
      </h2>

      {listings.isLoading ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-square w-full rounded-xl" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-16 text-center">
          <Package className="size-8 text-muted-foreground" />
          <p className="font-semibold">No active listings</p>
          <Text muted className="max-w-xs text-sm">
            {profile.displayName} doesn’t have anything listed right now.
          </Text>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <Skeleton className="h-44 w-full rounded-3xl" />
      <Skeleton className="mb-4 mt-8 h-6 w-32" />
      <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
