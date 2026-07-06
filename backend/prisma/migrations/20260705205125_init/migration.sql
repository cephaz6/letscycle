-- PostGIS for geography(Point, 4326) columns
CREATE EXTENSION IF NOT EXISTS postgis;

-- array_to_string is only STABLE; generated columns need IMMUTABLE expressions.
-- Safe here: text[] -> text with a constant delimiter is deterministic.
CREATE FUNCTION "immutableArrayToString"(text[], text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  RETURN array_to_string($1, $2);

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('active', 'suspended', 'deleted');

-- CreateEnum
CREATE TYPE "VerificationType" AS ENUM ('idDocument', 'phone', 'email');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('pending', 'verified', 'failed');

-- CreateEnum
CREATE TYPE "ListingCondition" AS ENUM ('new', 'likeNew', 'good', 'fair', 'poor');

-- CreateEnum
CREATE TYPE "ListingType" AS ENUM ('sell', 'giveaway');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('draft', 'active', 'reserved', 'completed', 'expired', 'removed');

-- CreateEnum
CREATE TYPE "ListingViewSource" AS ENUM ('search', 'match', 'direct', 'profile');

-- CreateEnum
CREATE TYPE "ListingTypePreference" AS ENUM ('sell', 'giveaway', 'both');

-- CreateEnum
CREATE TYPE "WishlistItemStatus" AS ENUM ('active', 'paused', 'fulfilled', 'expired');

-- CreateEnum
CREATE TYPE "MatchCandidateStatus" AS ENUM ('notified', 'interested', 'expired', 'superseded', 'won');

-- CreateEnum
CREATE TYPE "MatchEventType" AS ENUM ('candidatesComputed', 'notificationsSent', 'interestExpressed', 'winnerSelected');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('active', 'archived');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('initiated', 'paymentAuthorised', 'paymentCaptured', 'inEscrow', 'completed', 'disputed', 'refunded', 'cancelled');

-- CreateEnum
CREATE TYPE "PayoutOnboardingStatus" AS ENUM ('pending', 'complete', 'restricted');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('open', 'underReview', 'resolvedBuyer', 'resolvedSeller', 'closed');

-- CreateEnum
CREATE TYPE "TrustEventType" AS ENUM ('successfulTransaction', 'noShow', 'disputeLost', 'idVerified', 'positiveReview', 'negativeReview', 'flagged');

-- CreateEnum
CREATE TYPE "FlagTargetType" AS ENUM ('user', 'listing', 'message');

-- CreateEnum
CREATE TYPE "FlagStatus" AS ENUM ('open', 'reviewed', 'actioned', 'dismissed');

-- CreateEnum
CREATE TYPE "MeetPointCategory" AS ENUM ('policeStation', 'supermarket', 'library', 'communityCentre');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('matchFound', 'messageReceived', 'transactionUpdate', 'reviewReceived', 'system');

-- CreateEnum
CREATE TYPE "S3LifecycleStatus" AS ENUM ('pending', 'confirmed', 'orphaned', 'deleted');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('pending', 'published', 'failed');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('pending', 'running', 'succeeded', 'failed', 'retrying');

-- CreateEnum
CREATE TYPE "WebhookEventStatus" AS ENUM ('received', 'processed', 'failed', 'duplicate');

-- CreateEnum
CREATE TYPE "EmailDeliveryStatus" AS ENUM ('sent', 'delivered', 'bounced', 'complained', 'rejected');

-- CreateTable
CREATE TABLE "user" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "homeLocation" geography(Point, 4326),
    "homeLocationAccuracyMetres" INTEGER,
    "accountStatus" "AccountStatus" NOT NULL DEFAULT 'active',
    "emailVerifiedAt" TIMESTAMPTZ(6),
    "phoneVerifiedAt" TIMESTAMPTZ(6),
    "cognitoSub" TEXT NOT NULL,
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "userVerification" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "verificationType" "VerificationType" NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'pending',
    "verifiedAt" TIMESTAMPTZ(6),
    "providerReference" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "userVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blockedUser" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "blockerUserId" UUID NOT NULL,
    "blockedUserId" UUID NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blockedUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refreshToken" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "revokedAt" TIMESTAMPTZ(6),
    "userAgent" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sellerId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "categoryId" UUID NOT NULL,
    "condition" "ListingCondition" NOT NULL,
    "listingType" "ListingType" NOT NULL,
    "pricePence" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "location" geography(Point, 4326) NOT NULL,
    "locationAccuracyMetres" INTEGER NOT NULL,
    "status" "ListingStatus" NOT NULL DEFAULT 'draft',
    "deadlineAt" TIMESTAMPTZ(6),
    "publishedAt" TIMESTAMPTZ(6),
    "expiresAt" TIMESTAMPTZ(6),
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "searchText" tsvector GENERATED ALWAYS AS (to_tsvector('english', "title" || ' ' || "description")) STORED,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listingPhoto" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "listingId" UUID NOT NULL,
    "s3ObjectId" UUID NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listingPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" UUID,
    "typicalDistanceKm" INTEGER NOT NULL,
    "iconName" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favourite" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "listingId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favourite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listingView" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "listingId" UUID NOT NULL,
    "viewerUserId" UUID,
    "viewedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "ListingViewSource" NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listingView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlistItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "categoryId" UUID,
    "keywords" TEXT[],
    "maxPricePence" INTEGER,
    "maxDistanceKm" INTEGER NOT NULL,
    "listingTypePreference" "ListingTypePreference" NOT NULL DEFAULT 'both',
    "status" "WishlistItemStatus" NOT NULL DEFAULT 'active',
    "searchText" tsvector GENERATED ALWAYS AS (to_tsvector('english', "immutableArrayToString"("keywords", ' '))) STORED,
    "expiresAt" TIMESTAMPTZ(6),
    "fulfilledAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matchCandidate" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "listingId" UUID NOT NULL,
    "wishlistItemId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "compositeScore" DOUBLE PRECISION NOT NULL,
    "proximityScore" DOUBLE PRECISION NOT NULL,
    "keywordScore" DOUBLE PRECISION NOT NULL,
    "trustScoreAtMatch" DOUBLE PRECISION NOT NULL,
    "urgencyScore" DOUBLE PRECISION NOT NULL,
    "rank" INTEGER NOT NULL,
    "status" "MatchCandidateStatus" NOT NULL DEFAULT 'notified',
    "notifiedAt" TIMESTAMPTZ(6),
    "expressedInterestAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "matchCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matchEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "listingId" UUID NOT NULL,
    "eventType" "MatchEventType" NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "matchEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "listingId" UUID,
    "buyerId" UUID NOT NULL,
    "sellerId" UUID NOT NULL,
    "status" "ConversationStatus" NOT NULL DEFAULT 'active',
    "lastMessageAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "conversationId" UUID NOT NULL,
    "senderId" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "readAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "listingId" UUID NOT NULL,
    "buyerId" UUID NOT NULL,
    "sellerId" UUID NOT NULL,
    "amountPence" INTEGER NOT NULL,
    "commissionPence" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "status" "TransactionStatus" NOT NULL DEFAULT 'initiated',
    "meetPointId" UUID,
    "agreedPickupAt" TIMESTAMPTZ(6),
    "completedAt" TIMESTAMPTZ(6),
    "stripePaymentIntentId" TEXT,
    "stripeTransferId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactionEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "transactionId" UUID NOT NULL,
    "eventType" TEXT NOT NULL,
    "actorId" UUID,
    "notes" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payoutAccount" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "stripeConnectAccountId" TEXT NOT NULL,
    "onboardingStatus" "PayoutOnboardingStatus" NOT NULL DEFAULT 'pending',
    "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payoutAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispute" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "transactionId" UUID NOT NULL,
    "openedByUserId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'open',
    "resolutionNotes" TEXT,
    "resolvedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trustScore" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "currentScore" DOUBLE PRECISION NOT NULL,
    "scoreComponents" JSONB NOT NULL DEFAULT '{}',
    "lastCalculatedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trustScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trustEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "eventType" "TrustEventType" NOT NULL,
    "impact" DOUBLE PRECISION NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trustEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "transactionId" UUID NOT NULL,
    "reviewerUserId" UUID NOT NULL,
    "revieweeUserId" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flag" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "targetType" "FlagTargetType" NOT NULL,
    "targetId" UUID NOT NULL,
    "reporterUserId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "status" "FlagStatus" NOT NULL DEFAULT 'open',
    "resolvedAt" TIMESTAMPTZ(6),
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meetPoint" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "location" geography(Point, 4326) NOT NULL,
    "address" TEXT NOT NULL,
    "category" "MeetPointCategory" NOT NULL,
    "verifiedAt" TIMESTAMPTZ(6),
    "openingHours" JSONB NOT NULL DEFAULT '{}',
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meetPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safeTransitSession" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "transactionId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "startedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMPTZ(6),
    "liveLocationShareEnabled" BOOLEAN NOT NULL DEFAULT false,
    "trustedContactNotified" BOOLEAN NOT NULL DEFAULT false,
    "arrivalConfirmedAt" TIMESTAMPTZ(6),
    "duressTriggeredAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "safeTransitSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "readAt" TIMESTAMPTZ(6),
    "deliveredChannels" TEXT[],
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pushSubscription" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "endpoint" TEXT NOT NULL,
    "keys" JSONB NOT NULL,
    "userAgent" TEXT NOT NULL,
    "revokedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificationPreference" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "notificationType" "NotificationType" NOT NULL,
    "channels" TEXT[],
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "siteSetting" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "siteSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "termsAcceptance" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "termsVersion" TEXT NOT NULL,
    "acceptedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "termsAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "s3Object" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bucket" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "ownerUserId" UUID,
    "lifecycleStatus" "S3LifecycleStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "s3Object_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" UUID NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'pending',
    "publishedAt" TIMESTAMPTZ(6),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditLog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actorUserId" UUID,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" UUID,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "jobType" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "status" "JobStatus" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "nextRunAt" TIMESTAMPTZ(6),
    "lastError" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "externalWebhookEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider" TEXT NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "WebhookEventStatus" NOT NULL DEFAULT 'received',
    "processedAt" TIMESTAMPTZ(6),
    "error" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "externalWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emailDelivery" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "messageId" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "emailType" TEXT NOT NULL,
    "status" "EmailDeliveryStatus" NOT NULL DEFAULT 'sent',
    "payload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emailDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_cognitoSub_key" ON "user"("cognitoSub");

-- CreateIndex
CREATE INDEX "userVerification_userId_idx" ON "userVerification"("userId");

-- CreateIndex
CREATE INDEX "blockedUser_blockedUserId_idx" ON "blockedUser"("blockedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "blockedUser_blockerUserId_blockedUserId_key" ON "blockedUser"("blockerUserId", "blockedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "refreshToken_tokenHash_key" ON "refreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "refreshToken_userId_idx" ON "refreshToken"("userId");

-- CreateIndex
CREATE INDEX "listing_sellerId_idx" ON "listing"("sellerId");

-- CreateIndex
CREATE INDEX "listing_categoryId_idx" ON "listing"("categoryId");

-- CreateIndex
CREATE INDEX "listing_status_idx" ON "listing"("status");

-- CreateIndex
CREATE INDEX "listingPhoto_listingId_idx" ON "listingPhoto"("listingId");

-- CreateIndex
CREATE INDEX "listingPhoto_s3ObjectId_idx" ON "listingPhoto"("s3ObjectId");

-- CreateIndex
CREATE UNIQUE INDEX "category_slug_key" ON "category"("slug");

-- CreateIndex
CREATE INDEX "category_parentId_idx" ON "category"("parentId");

-- CreateIndex
CREATE INDEX "favourite_listingId_idx" ON "favourite"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "favourite_userId_listingId_key" ON "favourite"("userId", "listingId");

-- CreateIndex
CREATE INDEX "listingView_listingId_idx" ON "listingView"("listingId");

-- CreateIndex
CREATE INDEX "listingView_viewerUserId_idx" ON "listingView"("viewerUserId");

-- CreateIndex
CREATE INDEX "wishlistItem_userId_idx" ON "wishlistItem"("userId");

-- CreateIndex
CREATE INDEX "wishlistItem_categoryId_idx" ON "wishlistItem"("categoryId");

-- CreateIndex
CREATE INDEX "wishlistItem_status_idx" ON "wishlistItem"("status");

-- CreateIndex
CREATE INDEX "matchCandidate_listingId_idx" ON "matchCandidate"("listingId");

-- CreateIndex
CREATE INDEX "matchCandidate_wishlistItemId_idx" ON "matchCandidate"("wishlistItemId");

-- CreateIndex
CREATE INDEX "matchCandidate_userId_idx" ON "matchCandidate"("userId");

-- CreateIndex
CREATE INDEX "matchEvent_listingId_idx" ON "matchEvent"("listingId");

-- CreateIndex
CREATE INDEX "conversation_listingId_idx" ON "conversation"("listingId");

-- CreateIndex
CREATE INDEX "conversation_buyerId_idx" ON "conversation"("buyerId");

-- CreateIndex
CREATE INDEX "conversation_sellerId_idx" ON "conversation"("sellerId");

-- CreateIndex
CREATE INDEX "message_conversationId_idx" ON "message"("conversationId");

-- CreateIndex
CREATE INDEX "message_senderId_idx" ON "message"("senderId");

-- CreateIndex
CREATE INDEX "transaction_listingId_idx" ON "transaction"("listingId");

-- CreateIndex
CREATE INDEX "transaction_buyerId_idx" ON "transaction"("buyerId");

-- CreateIndex
CREATE INDEX "transaction_sellerId_idx" ON "transaction"("sellerId");

-- CreateIndex
CREATE INDEX "transaction_meetPointId_idx" ON "transaction"("meetPointId");

-- CreateIndex
CREATE INDEX "transactionEvent_transactionId_idx" ON "transactionEvent"("transactionId");

-- CreateIndex
CREATE INDEX "transactionEvent_actorId_idx" ON "transactionEvent"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "payoutAccount_userId_key" ON "payoutAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "payoutAccount_stripeConnectAccountId_key" ON "payoutAccount"("stripeConnectAccountId");

-- CreateIndex
CREATE INDEX "dispute_transactionId_idx" ON "dispute"("transactionId");

-- CreateIndex
CREATE INDEX "dispute_openedByUserId_idx" ON "dispute"("openedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "trustScore_userId_key" ON "trustScore"("userId");

-- CreateIndex
CREATE INDEX "trustEvent_userId_idx" ON "trustEvent"("userId");

-- CreateIndex
CREATE INDEX "review_transactionId_idx" ON "review"("transactionId");

-- CreateIndex
CREATE INDEX "review_reviewerUserId_idx" ON "review"("reviewerUserId");

-- CreateIndex
CREATE INDEX "review_revieweeUserId_idx" ON "review"("revieweeUserId");

-- CreateIndex
CREATE INDEX "flag_reporterUserId_idx" ON "flag"("reporterUserId");

-- CreateIndex
CREATE INDEX "flag_targetType_targetId_idx" ON "flag"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "safeTransitSession_transactionId_idx" ON "safeTransitSession"("transactionId");

-- CreateIndex
CREATE INDEX "safeTransitSession_userId_idx" ON "safeTransitSession"("userId");

-- CreateIndex
CREATE INDEX "notification_userId_idx" ON "notification"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "pushSubscription_endpoint_key" ON "pushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "pushSubscription_userId_idx" ON "pushSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "notificationPreference_userId_notificationType_key" ON "notificationPreference"("userId", "notificationType");

-- CreateIndex
CREATE UNIQUE INDEX "siteSetting_key_key" ON "siteSetting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "termsAcceptance_userId_termsVersion_key" ON "termsAcceptance"("userId", "termsVersion");

-- CreateIndex
CREATE UNIQUE INDEX "s3Object_key_key" ON "s3Object"("key");

-- CreateIndex
CREATE INDEX "s3Object_ownerUserId_idx" ON "s3Object"("ownerUserId");

-- CreateIndex
CREATE INDEX "outbox_status_createdAt_idx" ON "outbox"("status", "createdAt");

-- CreateIndex
CREATE INDEX "auditLog_actorUserId_idx" ON "auditLog"("actorUserId");

-- CreateIndex
CREATE INDEX "job_status_idx" ON "job"("status");

-- CreateIndex
CREATE UNIQUE INDEX "externalWebhookEvent_provider_externalEventId_key" ON "externalWebhookEvent"("provider", "externalEventId");

-- CreateIndex
CREATE UNIQUE INDEX "emailDelivery_messageId_key" ON "emailDelivery"("messageId");

-- AddForeignKey
ALTER TABLE "userVerification" ADD CONSTRAINT "userVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blockedUser" ADD CONSTRAINT "blockedUser_blockerUserId_fkey" FOREIGN KEY ("blockerUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blockedUser" ADD CONSTRAINT "blockedUser_blockedUserId_fkey" FOREIGN KEY ("blockedUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refreshToken" ADD CONSTRAINT "refreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing" ADD CONSTRAINT "listing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing" ADD CONSTRAINT "listing_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listingPhoto" ADD CONSTRAINT "listingPhoto_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listingPhoto" ADD CONSTRAINT "listingPhoto_s3ObjectId_fkey" FOREIGN KEY ("s3ObjectId") REFERENCES "s3Object"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favourite" ADD CONSTRAINT "favourite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favourite" ADD CONSTRAINT "favourite_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listingView" ADD CONSTRAINT "listingView_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listingView" ADD CONSTRAINT "listingView_viewerUserId_fkey" FOREIGN KEY ("viewerUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlistItem" ADD CONSTRAINT "wishlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlistItem" ADD CONSTRAINT "wishlistItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matchCandidate" ADD CONSTRAINT "matchCandidate_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matchCandidate" ADD CONSTRAINT "matchCandidate_wishlistItemId_fkey" FOREIGN KEY ("wishlistItemId") REFERENCES "wishlistItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matchCandidate" ADD CONSTRAINT "matchCandidate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matchEvent" ADD CONSTRAINT "matchEvent_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_meetPointId_fkey" FOREIGN KEY ("meetPointId") REFERENCES "meetPoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactionEvent" ADD CONSTRAINT "transactionEvent_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactionEvent" ADD CONSTRAINT "transactionEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payoutAccount" ADD CONSTRAINT "payoutAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute" ADD CONSTRAINT "dispute_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute" ADD CONSTRAINT "dispute_openedByUserId_fkey" FOREIGN KEY ("openedByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trustScore" ADD CONSTRAINT "trustScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trustEvent" ADD CONSTRAINT "trustEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_revieweeUserId_fkey" FOREIGN KEY ("revieweeUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flag" ADD CONSTRAINT "flag_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safeTransitSession" ADD CONSTRAINT "safeTransitSession_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safeTransitSession" ADD CONSTRAINT "safeTransitSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pushSubscription" ADD CONSTRAINT "pushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificationPreference" ADD CONSTRAINT "notificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "termsAcceptance" ADD CONSTRAINT "termsAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "s3Object" ADD CONSTRAINT "s3Object_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditLog" ADD CONSTRAINT "auditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Geospatial + full-text indexes (Prisma cannot express indexes on Unsupported columns)
CREATE INDEX "listing_location_idx" ON "listing" USING GIST ("location");
CREATE INDEX "meetPoint_location_idx" ON "meetPoint" USING GIST ("location");
CREATE INDEX "listing_searchText_idx" ON "listing" USING GIN ("searchText");
