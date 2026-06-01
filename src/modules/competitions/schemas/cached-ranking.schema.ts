import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CachedRankingDocument = HydratedDocument<CachedRanking>;

@Schema({ collection: 'cached_rankings' })
export class CachedRanking {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, default: 'global' })
  scope!: string;

  @Prop({ required: true, default: 'all' })
  platform!: string;

  @Prop({ required: true })
  rank!: number;

  @Prop({ required: true, default: 0 })
  rating!: number;

  @Prop({ default: 0 })
  delta!: number;

  @Prop({ default: 0 })
  contestsLast30d!: number;

  @Prop({ default: () => new Date() })
  calculatedAt!: Date;
}

export const CachedRankingSchema = SchemaFactory.createForClass(CachedRanking);
CachedRankingSchema.index(
  { userId: 1, scope: 1, platform: 1 },
  { unique: true },
);
CachedRankingSchema.index({ scope: 1, platform: 1, rank: 1 });
