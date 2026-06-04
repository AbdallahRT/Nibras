import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  AssignmentSubmissionStatus,
  TestCaseResultStatus,
} from '@modules/courses/enums/course.enums';
import { SubmissionStatus } from '@modules/competitions/enums/competition.enums';

export type AssignmentSubmissionDocument =
  HydratedDocument<AssignmentSubmission>;

@Schema({ _id: false })
export class TestCaseResult {
  @Prop({ type: Types.ObjectId, required: true })
  testCaseId!: Types.ObjectId;

  @Prop({ type: String, enum: TestCaseResultStatus, required: true })
  status!: TestCaseResultStatus;

  @Prop()
  actualOutput?: string;

  @Prop()
  timeMs?: number;

  @Prop()
  memoryKb?: number;

  @Prop()
  message?: string;
}

@Schema({ _id: false })
export class RubricScoreEntry {
  @Prop({ required: true })
  criterionName!: string;

  @Prop({ required: true })
  levelLabel!: string;

  @Prop({ required: true })
  points!: number;
}

@Schema({ _id: false })
export class PeerReviewEntry {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  reviewerId!: Types.ObjectId;

  @Prop({ default: '' })
  feedback!: string;

  @Prop()
  score?: number;

  @Prop({ default: () => new Date() })
  submittedAt!: Date;
}

@Schema({ _id: false })
export class StyleReport {
  @Prop({ default: () => new Date() })
  generatedAt!: Date;

  @Prop({ type: Object, default: {} })
  issues!: Record<string, unknown>;

  @Prop({ default: 0 })
  issueCount!: number;
}

@Schema({ timestamps: true, collection: 'assignment_submissions' })
export class AssignmentSubmission {
  @Prop({ type: Types.ObjectId, ref: 'Assignment', required: true })
  assignmentId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ default: '' })
  content!: string;

  @Prop()
  language?: string;

  @Prop()
  code?: string;

  @Prop()
  fileUrl?: string;

  @Prop({ type: Object, default: {} })
  answersJson!: Record<string, unknown>;

  @Prop({
    type: String,
    enum: AssignmentSubmissionStatus,
    default: AssignmentSubmissionStatus.Draft,
  })
  status!: AssignmentSubmissionStatus;

  @Prop({ type: String, enum: SubmissionStatus })
  verdict?: SubmissionStatus;

  @Prop({ type: [TestCaseResult], default: [] })
  testResults!: TestCaseResult[];

  @Prop()
  runtime?: number;

  @Prop()
  memory?: number;

  @Prop()
  score?: number;

  @Prop({ type: [RubricScoreEntry], default: [] })
  rubricScores!: RubricScoreEntry[];

  @Prop()
  textFeedback?: string;

  @Prop()
  videoFeedbackUrl?: string;

  @Prop({ type: [PeerReviewEntry], default: [] })
  peerReviews!: PeerReviewEntry[];

  @Prop({ type: StyleReport })
  styleReport?: StyleReport;

  @Prop()
  submittedAt?: Date;
}

export const AssignmentSubmissionSchema =
  SchemaFactory.createForClass(AssignmentSubmission);
AssignmentSubmissionSchema.index(
  { assignmentId: 1, userId: 1 },
  { unique: true },
);
AssignmentSubmissionSchema.index({ assignmentId: 1, status: 1 });
