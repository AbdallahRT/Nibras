-- Add pin/accept fields for course discussion posts
ALTER TABLE "CommunityPost" ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CommunityPost" ADD COLUMN "accepted" BOOLEAN NOT NULL DEFAULT false;
