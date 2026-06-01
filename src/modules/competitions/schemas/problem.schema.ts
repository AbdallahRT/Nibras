import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { CompPlatform } from '../enums/competition.enums';

export type ProblemDocument = HydratedDocument<Problem>;

@Schema({ _id: false })
export class TestCase {
  @Prop({ required: true })
  input!: string;

  @Prop({ required: true })
  expectedOutput!: string;

  @Prop({ default: false })
  isSample!: boolean;
}

@Schema({ _id: false })
export class SampleIO {
  @Prop({ required: true })
  input!: string;

  @Prop({ required: true })
  output!: string;
}

export type TestCaseDocument = TestCase;
export type SampleIODocument = SampleIO;

@Schema({ timestamps: true, collection: 'problems' })
export class Problem {
  @Prop({ required: true, enum: CompPlatform, type: String })
  platform!: CompPlatform;

  @Prop({ required: true })
  platformProblemId!: string;

  @Prop({ required: true })
  title!: string;

  @Prop()
  description?: string;

  @Prop()
  url?: string;

  @Prop({ default: 0 })
  difficulty!: number;

  @Prop({ type: [String], default: [] })
  tags!: string[];

  @Prop()
  source?: string;

  @Prop()
  externalId?: string;

  @Prop()
  constraints?: string;

  @Prop({ type: [TestCase], default: [] })
  testCases!: TestCase[];

  @Prop({ type: [SampleIO], default: [] })
  sampleIO!: SampleIO[];
}

export const ProblemSchema = SchemaFactory.createForClass(Problem);
ProblemSchema.index({ platform: 1, platformProblemId: 1 }, { unique: true });
ProblemSchema.index({ platform: 1 });
ProblemSchema.index({ difficulty: 1 });
