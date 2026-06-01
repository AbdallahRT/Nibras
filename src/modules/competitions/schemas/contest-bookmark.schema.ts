import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ContestBookmarkDocument = HydratedDocument<ContestBookmark>;

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'contest_bookmarks',
})
export class ContestBookmark {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Contest', required: true })
  contestId!: Types.ObjectId;
}

export const ContestBookmarkSchema =
  SchemaFactory.createForClass(ContestBookmark);
ContestBookmarkSchema.index({ userId: 1, contestId: 1 }, { unique: true });
ContestBookmarkSchema.index({ userId: 1 });
