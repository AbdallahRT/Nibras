-- Add thread vote support for course discussions
ALTER TYPE "CommunityVoteTargetType" ADD VALUE IF NOT EXISTS 'thread';

ALTER TABLE "CommunityThread" ADD COLUMN IF NOT EXISTS "votesCount" INTEGER NOT NULL DEFAULT 0;
