import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TestCaseDocument = HydratedDocument<TestCase>;

@Schema({ timestamps: true, collection: 'test_cases' })
export class TestCase {
  @Prop({
    type: Types.ObjectId,
    ref: 'Assignment',
    required: true,
    index: true,
  })
  assignmentId!: Types.ObjectId;

  @Prop({ required: true })
  input!: string;

  @Prop({ required: true })
  expectedOutput!: string;

  @Prop({ default: false })
  isHidden!: boolean;

  @Prop({ default: 1 })
  weight!: number;

  @Prop({ default: 5000 })
  timeLimit!: number;

  @Prop({ default: 256 })
  memoryLimit!: number;
}

export const TestCaseSchema = SchemaFactory.createForClass(TestCase);
