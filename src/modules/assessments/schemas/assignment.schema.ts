import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AssignmentType } from '@modules/courses/enums/course.enums';

export type AssignmentDocument = HydratedDocument<Assignment>;

@Schema({ _id: false })
export class ResourceLimits {
  @Prop({ default: 1 })
  cpuCores!: number;

  @Prop({ default: 256 })
  memoryMb!: number;

  @Prop({ default: 5000 })
  timeMs!: number;

  @Prop({ default: 50 })
  diskMb!: number;
}

@Schema({ timestamps: true, collection: 'assignments' })
export class Assignment {
  @Prop({ type: Types.ObjectId, ref: 'Course', required: true, index: true })
  courseId!: Types.ObjectId;

  @Prop({ required: true })
  title!: string;

  @Prop({ default: '' })
  description!: string;

  @Prop({ default: '' })
  content!: string;

  @Prop({ type: String, enum: AssignmentType, default: AssignmentType.Code })
  type!: AssignmentType;

  @Prop({ type: Object, default: {} })
  configJson!: Record<string, unknown>;

  @Prop()
  dueAt?: Date;

  @Prop({ default: 100 })
  pointsPossible!: number;

  @Prop({ type: Types.ObjectId, ref: 'Rubric' })
  rubricId?: Types.ObjectId;

  @Prop({ type: Object, default: {} })
  testSuite!: Record<string, unknown>;

  @Prop({ type: ResourceLimits, default: () => ({}) })
  resourceLimits!: ResourceLimits;

  @Prop({ default: true })
  published!: boolean;

  @Prop({ default: 0 })
  sortOrder!: number;
}

export const AssignmentSchema = SchemaFactory.createForClass(Assignment);
AssignmentSchema.index({ courseId: 1, sortOrder: 1 });
