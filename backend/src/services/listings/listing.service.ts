import type { PrismaClient } from '@prisma/client';
import { getDb } from '../../shared/db/client.js';
import { withTransaction, type Tx } from '../../shared/db/transaction.js';
import { publishEvent } from '../../shared/events/publish.js';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../shared/errors/httpErrors.js';
import type { StorageService } from '../system/index.js';
import { assertCategoryExists } from './category.service.js';
import * as repo from './listing.repository.js';
import * as photoRepo from './listingPhoto.repository.js';
import * as favouriteRepo from './favourite.repository.js';
import * as viewRepo from './listingView.repository.js';
import { searchListings as runSearch } from './search.repository.js';
import type { ListingCoreRow } from './listing.repository.js';
import type {
  CreateListingInput,
  CreatePhotoUploadInput,
  ListingDetail,
  ListingType,
  SearchListingsFilters,
  SearchListingsResult,
  UpdateListingInput,
  ViewSource,
} from './listing.types.js';

function toDetail(core: ListingCoreRow, photos: ListingDetail['photos']): ListingDetail {
  return {
    id: core.id,
    sellerId: core.sellerId,
    title: core.title,
    description: core.description,
    categoryId: core.categoryId,
    condition: core.condition,
    listingType: core.listingType,
    pricePence: core.pricePence,
    currency: core.currency,
    location: {
      lat: core.lat,
      lng: core.lng,
      accuracyMetres: core.locationAccuracyMetres,
    },
    status: core.status,
    deadlineAt: core.deadlineAt,
    publishedAt: core.publishedAt,
    expiresAt: core.expiresAt,
    attributes: (core.attributes as Record<string, unknown>) ?? {},
    createdAt: core.createdAt,
    updatedAt: core.updatedAt,
    photos,
  };
}

// Sell listings need a positive price; giveaways must have none.
function normalisePrice(
  listingType: ListingType,
  pricePence: number | null,
): number | null {
  if (listingType === 'giveaway') return null;
  if (pricePence === null || pricePence <= 0) {
    throw new BadRequestError('Sell listings require a positive pricePence');
  }
  return pricePence;
}

async function loadDetail(db: PrismaClient | Tx, id: string): Promise<ListingDetail> {
  const core = await repo.getCore(db, id);
  if (!core) {
    throw new NotFoundError('Listing not found');
  }
  const photos = await photoRepo.listConfirmedPhotos(db, id);
  return toDetail(core, photos);
}

export async function createListing(
  input: CreateListingInput,
  db: PrismaClient = getDb(),
): Promise<ListingDetail> {
  await assertCategoryExists(input.categoryId, db);
  const pricePence = normalisePrice(input.listingType, input.pricePence);
  const publish = input.publish ?? false;
  const now = new Date();

  const id = await withTransaction(async (tx) => {
    const created = await repo.insertListing(tx, {
      sellerId: input.sellerId,
      title: input.title,
      description: input.description,
      categoryId: input.categoryId,
      condition: input.condition,
      listingType: input.listingType,
      pricePence,
      location: input.location,
      status: publish ? 'active' : 'draft',
      deadlineAt: input.deadlineAt ?? null,
      publishedAt: publish ? now : null,
      attributes: input.attributes ?? {},
    });
    if (publish) {
      await publishEvent(tx, {
        eventType: 'listing.created',
        aggregateType: 'listing',
        aggregateId: created.id,
        payload: { listingId: created.id, sellerId: input.sellerId },
      });
    }
    return created.id;
  }, db);

  return loadDetail(db, id);
}

async function requireOwned(db: PrismaClient | Tx, listingId: string, userId: string) {
  const listing = await repo.getForUpdate(db, listingId);
  if (!listing) {
    throw new NotFoundError('Listing not found');
  }
  if (listing.sellerId !== userId) {
    throw new ForbiddenError('Not your listing');
  }
  return listing;
}

export async function getListing(
  id: string,
  db: PrismaClient = getDb(),
): Promise<ListingDetail> {
  return loadDetail(db, id);
}

export async function viewListing(
  id: string,
  viewerUserId: string | null,
  source: ViewSource,
  db: PrismaClient = getDb(),
): Promise<ListingDetail> {
  const detail = await loadDetail(db, id);
  await viewRepo.recordView(db, { listingId: id, viewerUserId, source });
  return detail;
}

export async function updateListing(
  id: string,
  userId: string,
  input: UpdateListingInput,
  db: PrismaClient = getDb(),
): Promise<ListingDetail> {
  const current = await requireOwned(db, id, userId);
  if (current.status !== 'draft' && current.status !== 'active') {
    throw new BadRequestError(`Cannot edit a ${current.status} listing`);
  }
  if (input.categoryId) {
    await assertCategoryExists(input.categoryId, db);
  }

  const patch: repo.ListingUpdatePatch = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description;
  if (input.categoryId !== undefined) patch.categoryId = input.categoryId;
  if (input.condition !== undefined) patch.condition = input.condition;
  if (input.deadlineAt !== undefined) patch.deadlineAt = input.deadlineAt;
  if (input.attributes !== undefined) patch.attributes = input.attributes;
  if (input.location !== undefined) patch.location = input.location;
  if (input.pricePence !== undefined) {
    patch.pricePence = normalisePrice(current.listingType, input.pricePence);
  }

  const newStatus = input.status ?? current.status;
  let event: 'listing.created' | 'listing.updated' | null = null;

  if (current.status === 'draft' && newStatus === 'active') {
    patch.status = 'active';
    if (current.publishedAt === null) {
      patch.publishedAt = new Date();
      event = 'listing.created'; // first publish
    } else {
      event = 'listing.updated'; // re-publish
    }
  } else if (current.status === 'active' && newStatus === 'draft') {
    patch.status = 'draft';
    event = 'listing.updated';
  } else if (current.status === 'active') {
    event = 'listing.updated';
  }

  await withTransaction(async (tx) => {
    await repo.updateListing(tx, id, patch);
    if (event === 'listing.created') {
      await publishEvent(tx, {
        eventType: 'listing.created',
        aggregateType: 'listing',
        aggregateId: id,
        payload: { listingId: id, sellerId: userId },
      });
    } else if (event === 'listing.updated') {
      await publishEvent(tx, {
        eventType: 'listing.updated',
        aggregateType: 'listing',
        aggregateId: id,
        payload: { listingId: id },
      });
    }
  }, db);

  return loadDetail(db, id);
}

export async function removeListing(
  id: string,
  userId: string,
  db: PrismaClient = getDb(),
): Promise<void> {
  const current = await requireOwned(db, id, userId);
  if (current.status === 'removed') return;

  await withTransaction(async (tx) => {
    await repo.updateListing(tx, id, { status: 'removed' });
    await publishEvent(tx, {
      eventType: 'listing.removed',
      aggregateType: 'listing',
      aggregateId: id,
      payload: { listingId: id },
    });
  }, db);
}

export async function searchListings(
  filters: SearchListingsFilters,
  db: PrismaClient = getDb(),
): Promise<SearchListingsResult> {
  return runSearch(db, filters);
}

// --- photos (two-step: presign + pending row, then confirm) ---

export interface PhotoUploadResult {
  photoId: string;
  s3ObjectId: string;
  uploadUrl: string;
  key: string;
  expiresInSeconds: number;
}

export async function createPhotoUpload(
  storage: StorageService,
  listingId: string,
  userId: string,
  input: CreatePhotoUploadInput,
  db: PrismaClient = getDb(),
): Promise<PhotoUploadResult> {
  await requireOwned(db, listingId, userId);

  const upload = await storage.createUpload({
    ownerUserId: userId,
    purpose: 'listingPhoto',
    contentType: input.contentType,
    sizeBytes: input.sizeBytes,
  });
  const photo = await photoRepo.insertPhoto(db, {
    listingId,
    s3ObjectId: upload.s3ObjectId,
    displayOrder: input.displayOrder,
    width: input.width,
    height: input.height,
  });

  return {
    photoId: photo.id,
    s3ObjectId: upload.s3ObjectId,
    uploadUrl: upload.uploadUrl,
    key: upload.key,
    expiresInSeconds: upload.expiresInSeconds,
  };
}

export async function confirmPhoto(
  storage: StorageService,
  listingId: string,
  photoId: string,
  userId: string,
  db: PrismaClient = getDb(),
): Promise<ListingDetail> {
  await requireOwned(db, listingId, userId);
  const photo = await photoRepo.getPhoto(db, photoId);
  if (!photo || photo.listingId !== listingId) {
    throw new NotFoundError('Photo not found');
  }
  await storage.confirmUpload(photo.s3ObjectId, userId);
  return loadDetail(db, listingId);
}

// --- favourites ---

export async function favouriteListing(
  userId: string,
  listingId: string,
  db: PrismaClient = getDb(),
): Promise<void> {
  const listing = await repo.getForUpdate(db, listingId);
  if (!listing) {
    throw new NotFoundError('Listing not found');
  }
  await favouriteRepo.addFavourite(db, userId, listingId);
}

export async function unfavouriteListing(
  userId: string,
  listingId: string,
  db: PrismaClient = getDb(),
): Promise<void> {
  await favouriteRepo.removeFavourite(db, userId, listingId);
}
