'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  CalendarDays,
  MessageCircle,
  ShieldCheck,
  Tag,
  UserRound,
} from 'lucide-react';
import { useCategories, useListing } from '@letscycle/api-client';
import { Badge, buttonVariants, cn, Heading, Skeleton, Text } from '@letscycle/ui';
import { ListingGallery } from '@/features/listings/components/listing-gallery';
import { RelatedListings } from '@/features/listings/components/related-listings';
import {
  formatCondition,
  formatPostedAt,
  formatPrice,
} from '@/features/listings/format';

export default function ListingDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: listing, isLoading, isError } = useListing(id);
  const { data: categories } = useCategories();

  if (isLoading) return <DetailSkeleton />;

  if (isError || !listing) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <Heading level={2}>Listing not found</Heading>
        <Text muted className="mt-2">
          It may have been removed or the link is incorrect.
        </Text>
        <Link href="/" className={cn(buttonVariants(), 'mt-6 rounded-full')}>
          Back to browse
        </Link>
      </div>
    );
  }

  const isFree = listing.listingType === 'giveaway' || listing.pricePence === null;
  const categoryName = categories?.find((c) => c.id === listing.categoryId)?.name;
  const postedAt = formatPostedAt(listing.publishedAt ?? listing.createdAt);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-4" /> Back to browse
      </Link>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Gallery */}
        <ListingGallery photos={listing.photos} title={listing.title} />

        {/* Info panel */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          {categoryName && (
            <Text muted className="text-sm">
              {categoryName}
            </Text>
          )}
          <Heading level={1} className="mt-1 text-2xl sm:text-3xl">
            {listing.title}
          </Heading>

          <div className="mt-3 flex items-center gap-3">
            <span className="text-3xl font-bold text-primary">
              {formatPrice(listing.pricePence, listing.listingType)}
            </span>
            {isFree && <Badge variant="success">Giveaway</Badge>}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline">{formatCondition(listing.condition)}</Badge>
            <Badge variant="muted" className="gap-1">
              <CalendarDays className="size-3.5" /> {postedAt}
            </Badge>
          </div>

          {/* Seller */}
          <Link
            href={`/u/${listing.sellerId}`}
            className="mt-5 flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-accent/50"
          >
            <span className="grid size-10 place-items-center rounded-full bg-muted">
              <UserRound className="size-5 text-muted-foreground" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold">Seller</span>
              <span className="block text-xs text-muted-foreground">
                View profile & trust score
              </span>
            </span>
          </Link>

          {/* Purchase / claim — requires auth */}
          <div className="mt-5 flex flex-col gap-2">
            <Link
              href={`/login?next=/listings/${listing.id}`}
              className={cn(buttonVariants({ size: 'lg' }), 'rounded-full')}
            >
              {isFree ? 'Claim this item' : 'Buy now'}
            </Link>
            <Link
              href={`/login?next=/listings/${listing.id}`}
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'rounded-full')}
            >
              <MessageCircle className="size-4" /> Message seller
            </Link>
            <Text muted className="text-center text-xs">
              You’ll need an account to {isFree ? 'claim' : 'buy'} — it’s free to join.
            </Text>
          </div>

          {/* Buyer protection */}
          <div className="mt-5 rounded-xl border border-border bg-muted/40 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="size-5 text-primary" /> Buyer protection
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              {(isFree
                ? [
                    'Arrange a safe pickup at a verified meet point.',
                    'Share arrival & duress signals for peace of mind.',
                    'Report anything that doesn’t look right.',
                  ]
                : [
                    'Payment is held securely until you confirm pickup.',
                    'Full refund if the item isn’t as described.',
                    'Meet safely at verified local points.',
                  ]
              ).map((point) => (
                <li key={point} className="flex gap-2">
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Description + details */}
      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section>
          <Heading level={3} className="mb-2">
            Description
          </Heading>
          <Text className="whitespace-pre-line text-[15px] leading-relaxed text-foreground/90">
            {listing.description}
          </Text>
        </section>

        <section>
          <Heading level={3} className="mb-2">
            Details
          </Heading>
          <dl className="divide-y divide-border rounded-xl border border-border text-sm">
            <DetailRow icon={<Tag className="size-4" />} label="Type">
              {isFree ? 'Free to a good home' : 'For sale'}
            </DetailRow>
            <DetailRow label="Condition">{formatCondition(listing.condition)}</DetailRow>
            {categoryName && <DetailRow label="Category">{categoryName}</DetailRow>}
            <DetailRow label="Posted">{postedAt}</DetailRow>
            <DetailRow label="Location">Liverpool, UK</DetailRow>
          </dl>
        </section>
      </div>

      <RelatedListings categoryId={listing.categoryId} excludeId={listing.id} />
    </div>
  );
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5">
      <dt className="flex items-center gap-2 text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <Skeleton className="mb-4 h-4 w-28" />
      <div className="grid gap-8 lg:grid-cols-2">
        <Skeleton className="aspect-square w-full rounded-xl sm:aspect-4/3" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-full" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
