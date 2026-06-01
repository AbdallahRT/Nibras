import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ProblemBookmarkDocument = HydratedDocument<ProblemBookmark>;

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'problem_bookmarks',
})
export class ProblemBookmark {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Problem', required: true })
  problemId!: Types.ObjectId;
}

export const ProblemBookmarkSchema =
  SchemaFactory.createForClass(ProblemBookmark);
ProblemBookmarkSchema.index({ userId: 1, problemId: 1 }, { unique: true });
ProblemBookmarkSchema.index({ userId: 1 });
