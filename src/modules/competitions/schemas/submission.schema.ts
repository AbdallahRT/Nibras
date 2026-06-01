import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { SubmissionStatus } from '../enums/competition.enums';

export type SubmissionDocument = HydratedDocument<Submission>;

@Schema({
  timestamps: { createdAt: true, updatedAt: true },
  collection: 'submissions',
})
export class Submission {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Problem', required: true })
  problemId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Contest', required: true })
  contestId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ContestTeam' })
  teamId?: Types.ObjectId;

  @Prop({ required: true })
  language!: string;

  @Prop({ required: true })
  code!: string;

  @Prop({
    type: String,
    enum: SubmissionStatus,
    default: SubmissionStatus.Pending,
  })
  status!: SubmissionStatus;

  @Prop()
  runtime?: number;

  @Prop()
  memory?: number;

  @Prop({ default: 0 })
  score!: number;

  @Prop({ default: () => new Date() })
  submittedAt!: Date;
}

export const SubmissionSchema = SchemaFactory.createForClass(Submission);
SubmissionSchema.index({ contestId: 1, userId: 1, problemId: 1 });
SubmissionSchema.index({ contestId: 1, status: 1, submittedAt: -1 });
