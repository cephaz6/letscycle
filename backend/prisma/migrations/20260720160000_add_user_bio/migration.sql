-- Add optional short bio/description to user profiles.
ALTER TABLE "user" ADD COLUMN "bio" VARCHAR(500);
