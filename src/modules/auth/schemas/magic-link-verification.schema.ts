import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MagicLinkVerificationDocument =
  HydratedDocument<MagicLinkVerification>;

@Schema({ timestamps: true, collection: 'magic_link_verifications' })
export class MagicLinkVerification {
  @Prop({ required: true, lowercase: true, trim: true, index: true })
  identifier!: string;

  @Prop({ required: true, unique: true })
  tokenHash!: string;

  @Prop({ required: true })
  expiresAt!: Date;
}

export const MagicLinkVerificationSchema = SchemaFactory.createForClass(
  MagicLinkVerification,
);
