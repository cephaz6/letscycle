'use client';

import { useState } from 'react';
import Image from 'next/image';
import { BadgeCheck, CalendarDays, MapPin, Package, Share2, Star } from 'lucide-react';
import { useListings, useMyTransactions, usePublicProfile } from '@letscycle/api-client';
import { Badge, Button, Skeleton, Text } from '@letscycle/ui';
import { ListingCard } from '@/features/listings/components/listing-card';
import { useAuth } from '@/features/auth';
import { Avatar } from '@/components/avatar';
import { ReviewsList, ReviewFormDialog } from '@/features/reviews';
import { ShareProfileDialog } from './share-profile-dialog';

export function PublicProfileView({ userId }: { userId: string }) {
  const { user, isAuthenticated } = useAuth();
  const { data: profile, isLoading, isError } = usePublicProfile(userId);
  const listings = useListings({ sellerId: userId, limit: 40 });
  const items = listings.data?.items ?? [];
  const [shareOpen, setShareOpen] = useState(false);

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
  const { stats } = profile;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Hero */}
      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="relative h-24 overflow-hidden sm:h-28">
          <Image
            src="/illustrations/profile-cover-art.jpg"
            alt=""
            fill
            priority
            sizes="(max-width: 1152px) 100vw, 1152px"
            className="object-cover"
          />
        </div>
        <div className="px-5 pb-5 sm:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <Avatar
                name={profile.displayName}
                avatarUrl={profile.avatarUrl}
                className="-mt-12 size-24 shrink-0 text-2xl shadow-lg ring-4 ring-card"
              />
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

            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => setShareOpen(true)}
              >
                <Share2 className="size-4" /> Share
              </Button>
              {isMe ? (
                <a
                  href="/me"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Edit profile
                </a>
              ) : (
                isAuthenticated && (
                  <ReviewCta profileId={profile.id} profileName={profile.displayName} />
                )
              )}
            </div>
          </div>

          {profile.bio && (
            <p className="mt-4 max-w-2xl whitespace-pre-line text-sm leading-relaxed text-foreground/90">
              {profile.bio}
            </p>
          )}

          {/* Stats */}
          <dl className="mt-5 grid max-w-lg grid-cols-3 gap-3">
            <Stat
              label={stats.listingsCount === 1 ? 'Listing' : 'Listings'}
              value={stats.listingsCount}
            />
            <Stat
              label={stats.salesCount === 1 ? 'Sale' : 'Sales'}
              value={stats.salesCount}
            />
            <Stat
              label={stats.reviewsCount === 1 ? 'Review' : 'Reviews'}
              value={stats.reviewsCount}
              extra={
                stats.averageRating != null ? (
                  <span className="mt-1 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                    <Star className="size-3 fill-amber-400 text-amber-400" />
                    {stats.averageRating.toFixed(1)}
                  </span>
                ) : null
              }
            />
          </dl>
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

      {/* Reviews */}
      <h2 className="mb-4 mt-10 text-lg font-bold tracking-tight">
        Reviews
        {stats.reviewsCount > 0 && (
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {stats.reviewsCount}
          </span>
        )}
      </h2>
      <ReviewsList userId={profile.id} />

      <ShareProfileDialog
        name={profile.displayName}
        open={shareOpen}
        onClose={() => setShareOpen(false)}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  extra,
}: {
  label: string;
  value: number;
  extra?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-3 text-center">
      <dd className="text-xl font-bold tracking-tight">{value}</dd>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      {extra}
    </div>
  );
}

/** Shown to a signed-in viewer who has a completed sale with this member. */
function ReviewCta({
  profileId,
  profileName,
}: {
  profileId: string;
  profileName: string;
}) {
  const { user } = useAuth();
  const { data: transactions } = useMyTransactions();
  const [open, setOpen] = useState(false);

  const eligible = (transactions ?? []).find(
    (t) =>
      t.status === 'completed' &&
      ((t.buyerId === user?.id && t.sellerId === profileId) ||
        (t.sellerId === user?.id && t.buyerId === profileId)),
  );

  if (!eligible) return null;

  return (
    <>
      <Button className="rounded-full" onClick={() => setOpen(true)}>
        <Star className="size-4" /> Leave a review
      </Button>
      <ReviewFormDialog
        revieweeUserId={profileId}
        revieweeName={profileName}
        transactionId={eligible.id}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <Skeleton className="h-52 w-full rounded-3xl" />
      <Skeleton className="mb-4 mt-8 h-6 w-32" />
      <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
