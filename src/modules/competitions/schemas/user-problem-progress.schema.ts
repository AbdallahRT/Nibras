import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserProblemProgressDocument = HydratedDocument<UserProblemProgress>;

@Schema({ timestamps: true, collection: 'user_problem_progress' })
export class UserProblemProgress {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Problem', required: true })
  problemId!: Types.ObjectId;

  @Prop({ default: false })
  solved!: boolean;

  @Prop()
  solvedAt?: Date;
}

export const UserProblemProgressSchema =
  SchemaFactory.createForClass(UserProblemProgress);
UserProblemProgressSchema.index({ userId: 1, problemId: 1 }, { unique: true });
UserProblemProgressSchema.index({ userId: 1, solved: 1 });
