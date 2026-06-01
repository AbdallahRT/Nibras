import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { CompPlatform } from '../enums/competition.enums';

export type UserContestParticipationDocument =
  HydratedDocument<UserContestParticipation>;

@Schema({ timestamps: true, collection: 'user_contest_participations' })
export class UserContestParticipation {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Contest', required: true })
  contestId!: Types.ObjectId;

  @Prop({ required: true, enum: CompPlatform, type: String })
  platform!: CompPlatform;

  @Prop()
  rank?: number;

  @Prop()
  participants?: number;

  @Prop()
  ratingBefore?: number;

  @Prop()
  ratingAfter?: number;

  @Prop()
  delta?: number;

  @Prop()
  solvedCount?: number;
}

export const UserContestParticipationSchema = SchemaFactory.createForClass(
  UserContestParticipation,
);
UserContestParticipationSchema.index(
  { userId: 1, contestId: 1 },
  { unique: true },
);
UserContestParticipationSchema.index({ userId: 1, platform: 1 });
UserContestParticipationSchema.index({ userId: 1, createdAt: -1 });
