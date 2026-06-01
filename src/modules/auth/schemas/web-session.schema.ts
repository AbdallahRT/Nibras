import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type WebSessionDocument = HydratedDocument<WebSession>;

@Schema({ timestamps: true, collection: 'web_sessions' })
export class WebSession {
  @Prop({ required: true, unique: true })
  sessionToken!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  expiresAt!: Date;

  @Prop()
  revokedAt?: Date;
}

export const WebSessionSchema = SchemaFactory.createForClass(WebSession);
