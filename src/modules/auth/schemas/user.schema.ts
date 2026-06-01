import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true, unique: true, trim: true })
  username!: string;

  @Prop()
  displayName?: string;

  @Prop()
  avatar?: string;

  @Prop({ type: Types.ObjectId, ref: 'Role', required: true })
  role!: Types.ObjectId;

  @Prop()
  institution?: string;

  @Prop({ default: 0 })
  reputationScore!: number;

  @Prop({ default: false })
  emailVerified!: boolean;

  @Prop({ default: false })
  githubLinked!: boolean;

  @Prop()
  oauthProvider?: string;

  @Prop()
  oauthId?: string;

  @Prop({ type: Object, default: {} })
  preferences!: Record<string, unknown>;

  @Prop()
  lastActive?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
