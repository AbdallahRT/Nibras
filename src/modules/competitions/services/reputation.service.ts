import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '@modules/auth/schemas/user.schema';
import { CompPlatform } from '../enums/competition.enums';
import { LinkedAccount } from '../schemas/linked-account.schema';

const AURA_RATING_MULTIPLIER = 2;

@Injectable()
export class ReputationService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(LinkedAccount.name)
    private readonly linkedAccountModel: Model<LinkedAccount>,
  ) {}

  computeAuraDelta(rating: number | null | undefined): number {
    if (!rating || rating <= 0) return 0;
    return Math.floor(rating / 100) * AURA_RATING_MULTIPLIER;
  }

  async syncLinkedAccountAura(
    userId: string,
    platform: CompPlatform,
  ): Promise<number> {
    const account = await this.linkedAccountModel
      .findOne({ userId, platform })
      .exec();
    if (!account?.platformRating) return 0;

    const delta = this.computeAuraDelta(account.platformRating);
    if (delta > 0) {
      await this.userModel.updateOne(
        { _id: userId },
        { $inc: { reputationScore: delta } },
      );
    }
    return delta;
  }
}
