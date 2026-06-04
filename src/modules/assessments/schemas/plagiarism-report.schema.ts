import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PlagiarismReportDocument = HydratedDocument<PlagiarismReport>;

@Schema({ _id: false })
export class SimilarityPair {
  @Prop({ type: Types.ObjectId, ref: 'AssignmentSubmission', required: true })
  submissionAId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'AssignmentSubmission', required: true })
  submissionBId!: Types.ObjectId;

  @Prop({ required: true })
  similarityPercent!: number;

  @Prop({ default: false })
  flagged!: boolean;
}

@Schema({ timestamps: true, collection: 'plagiarism_reports' })
export class PlagiarismReport {
  @Prop({
    type: Types.ObjectId,
    ref: 'Assignment',
    required: true,
    unique: true,
  })
  assignmentId!: Types.ObjectId;

  @Prop({ default: () => new Date() })
  checkedAt!: Date;

  @Prop({ type: [SimilarityPair], default: [] })
  pairs!: SimilarityPair[];

  @Prop({ default: '' })
  mossReportUrl?: string;
}

export const PlagiarismReportSchema =
  SchemaFactory.createForClass(PlagiarismReport);
