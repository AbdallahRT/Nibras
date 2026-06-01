import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CompSyncLogDocument = HydratedDocument<CompSyncLog>;

@Schema({ collection: 'comp_sync_logs' })
export class CompSyncLog {
  @Prop({ required: true })
  jobType!: string;

  @Prop()
  platform?: string;

  @Prop({ required: true })
  status!: string;

  @Prop({ default: 0 })
  itemCount!: number;

  @Prop()
  errorMessage?: string;

  @Prop({ required: true })
  startedAt!: Date;

  @Prop({ default: () => new Date() })
  finishedAt!: Date;
}

export const CompSyncLogSchema = SchemaFactory.createForClass(CompSyncLog);
CompSyncLogSchema.index({ jobType: 1, startedAt: -1 });
