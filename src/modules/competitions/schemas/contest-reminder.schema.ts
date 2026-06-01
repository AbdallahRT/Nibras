import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ContestReminderDocument = HydratedDocument<ContestReminder>;

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'contest_reminders',
})
export class ContestReminder {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Contest', required: true })
  contestId!: Types.ObjectId;

  @Prop({ default: 30 })
  minutesBefore!: number;

  @Prop({ default: false })
  notified!: boolean;
}

export const ContestReminderSchema =
  SchemaFactory.createForClass(ContestReminder);
ContestReminderSchema.index({ userId: 1, contestId: 1 }, { unique: true });
ContestReminderSchema.index({ notified: 1, contestId: 1 });
