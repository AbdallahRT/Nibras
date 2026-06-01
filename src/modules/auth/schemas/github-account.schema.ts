import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type GithubAccountDocument = HydratedDocument<GithubAccount>;

@Schema({ timestamps: true, collection: 'github_accounts' })
export class GithubAccount {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, unique: true })
  githubUserId!: string;

  @Prop({ required: true })
  login!: string;

  @Prop()
  accessToken?: string;

  @Prop()
  refreshToken?: string;

  @Prop()
  accessTokenExpiresAt?: Date;

  @Prop()
  refreshTokenExpiresAt?: Date;
}

export const GithubAccountSchema = SchemaFactory.createForClass(GithubAccount);
