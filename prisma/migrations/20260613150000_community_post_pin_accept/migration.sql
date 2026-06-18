-- Add pin/accept fields for course discussion posts
ALTER TABLE "CommunityPost" ADD COLUMN IF NOT EXISTS "pinned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CommunityPost" ADD COLUMN IF NOT EXISTS "accepted" BOOLEAN NOT NULL DEFAULT false;
