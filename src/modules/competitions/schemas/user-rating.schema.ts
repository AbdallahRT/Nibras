import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserRatingDocument = HydratedDocument<UserRating>;

@Schema({ _id: false })
export class RatingHistoryEntry {
  @Prop({ required: true })
  rating!: number;

  @Prop({ required: true })
  delta!: number;

  @Prop()
  contestId?: Types.ObjectId;

  @Prop({ default: () => new Date() })
  recordedAt!: Date;
}

@Schema({ timestamps: true, collection: 'user_ratings' })
export class UserRating {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  platform!: string;

  @Prop({ default: 1200 })
  rating!: number;

  @Prop({ default: 1200 })
  maxRating!: number;

  @Prop({ type: [RatingHistoryEntry], default: [] })
  history!: RatingHistoryEntry[];

  @Prop({ default: () => new Date() })
  lastUpdated!: Date;
}

export const UserRatingSchema = SchemaFactory.createForClass(UserRating);
UserRatingSchema.index({ userId: 1, platform: 1 }, { unique: true });
