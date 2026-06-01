import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ContestTeamDocument = HydratedDocument<ContestTeam>;

@Schema({ timestamps: true, collection: 'contest_teams' })
export class ContestTeam {
  @Prop({ type: Types.ObjectId, ref: 'Contest', required: true })
  contestId!: Types.ObjectId;

  @Prop({ required: true })
  name!: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], required: true })
  members!: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  captainId!: Types.ObjectId;
}

export const ContestTeamSchema = SchemaFactory.createForClass(ContestTeam);
ContestTeamSchema.index({ contestId: 1, name: 1 }, { unique: true });
ContestTeamSchema.index({ contestId: 1, members: 1 });
