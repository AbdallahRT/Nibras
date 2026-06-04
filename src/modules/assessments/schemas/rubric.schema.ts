import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type RubricDocument = HydratedDocument<Rubric>;

@Schema({ _id: false })
export class RubricLevel {
  @Prop({ required: true })
  label!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ required: true })
  points!: number;
}

@Schema({ _id: false })
export class RubricCriterion {
  @Prop({ required: true })
  name!: string;

  @Prop({ default: '' })
  description!: string;

  @Prop({ required: true })
  maxPoints!: number;

  @Prop({ type: [RubricLevel], default: [] })
  levels!: RubricLevel[];
}

@Schema({ timestamps: true, collection: 'rubrics' })
export class Rubric {
  @Prop({
    type: Types.ObjectId,
    ref: 'Assignment',
    required: true,
    unique: true,
  })
  assignmentId!: Types.ObjectId;

  @Prop({ type: [RubricCriterion], default: [] })
  criteria!: RubricCriterion[];
}

export const RubricSchema = SchemaFactory.createForClass(Rubric);
