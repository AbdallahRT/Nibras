import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  CompPlatform,
  ContestStatus,
  ScoringMode,
} from '../enums/competition.enums';

export type ContestDocument = HydratedDocument<Contest>;

@Schema({ timestamps: true, collection: 'contests' })
export class Contest {
  @Prop({ required: true, enum: CompPlatform, type: String })
  platform!: CompPlatform;

  @Prop({ required: true })
  platformContestId!: string;

  @Prop({ required: true })
  name!: string;

  @Prop()
  description?: string;

  @Prop()
  url?: string;

  @Prop({ required: true })
  startsAt!: Date;

  @Prop({ required: true })
  endsAt!: Date;

  @Prop({ required: true, default: 0 })
  durationMinutes!: number;

  @Prop({ default: 'BEFORE' })
  phase!: string;

  @Prop({ type: [String], default: [] })
  tags!: string[];

  @Prop({ type: String, enum: ContestStatus, default: ContestStatus.Scheduled })
  status!: ContestStatus;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  participants!: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Problem' }], default: [] })
  problems!: Types.ObjectId[];

  @Prop({ default: false })
  isTeamBased!: boolean;

  @Prop({ type: String, enum: ScoringMode, default: ScoringMode.Icpc })
  scoringMode!: ScoringMode;

  @Prop()
  archivedAt?: Date;
}

export const ContestSchema = SchemaFactory.createForClass(Contest);
ContestSchema.index({ platform: 1, platformContestId: 1 }, { unique: true });
ContestSchema.index({ startsAt: 1 });
ContestSchema.index({ platform: 1, startsAt: 1 });
