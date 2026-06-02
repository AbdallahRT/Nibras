import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Req,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';
import { isValidObjectId } from 'mongoose';
import { SessionAuthGuard } from '@common/guards/auth.guards';
import type { AuthenticatedUser } from '@modules/auth/types/authenticated-user.type';
import { VoteService } from '../services/vote.service';

type RequestWithUser = Request & { user: AuthenticatedUser };

@ApiTags('Votes')
@UseGuards(SessionAuthGuard)
@Controller('votes')
export class VoteController {
  constructor(private voteService: VoteService) {}

  @Post(':targetType/:targetId/upvote')
  @ApiOperation({ summary: 'Upvote a target' })
  async upvote(
    @Param('targetType') targetType: string,
    @Param('targetId') targetId: string,
    @Req() req: RequestWithUser,
  ) {
    if (!['Question', 'Answer', 'Post'].includes(targetType)) {
      throw new BadRequestException(
        'Invalid target type. Must be Question, Answer, or Post.',
      );
    }
    if (!isValidObjectId(targetId))
      throw new BadRequestException('Invalid target ID');
    const result = await this.voteService.castVote({
      targetType: targetType.toLowerCase(),
      targetId,
      userId: req.user.id,
      value: 1,
    });
    return {
      success: true,
      message: 'Upvote registered successfully',
      data: result,
    };
  }

  @Post(':targetType/:targetId/downvote')
  @ApiOperation({ summary: 'Downvote a target' })
  async downvote(
    @Param('targetType') targetType: string,
    @Param('targetId') targetId: string,
    @Req() req: RequestWithUser,
  ) {
    if (!['Question', 'Answer', 'Post'].includes(targetType)) {
      throw new BadRequestException(
        'Invalid target type. Must be Question, Answer, or Post.',
      );
    }
    if (!isValidObjectId(targetId))
      throw new BadRequestException('Invalid target ID');
    const result = await this.voteService.castVote({
      targetType: targetType.toLowerCase(),
      targetId,
      userId: req.user.id,
      value: -1,
    });
    return {
      success: true,
      message: 'Downvote registered successfully',
      data: result,
    };
  }

  @Delete(':targetType/:targetId')
  @ApiOperation({ summary: 'Remove vote from target' })
  async removeVote(
    @Param('targetType') targetType: string,
    @Param('targetId') targetId: string,
    @Req() req: RequestWithUser,
  ) {
    if (!['Question', 'Answer', 'Post'].includes(targetType)) {
      throw new BadRequestException(
        'Invalid target type. Must be Question, Answer, or Post.',
      );
    }
    if (!isValidObjectId(targetId))
      throw new BadRequestException('Invalid target ID');
    const result = await this.voteService.removeVote({
      targetType: targetType.toLowerCase(),
      targetId,
      userId: req.user.id,
    });
    return {
      success: true,
      message: 'Vote removed successfully',
      data: result,
    };
  }

  @Get('my-vote/:targetType/:targetId')
  @ApiOperation({ summary: 'Get my vote on a target' })
  async getMyVote(
    @Param('targetType') targetType: string,
    @Param('targetId') targetId: string,
    @Req() req: RequestWithUser,
  ) {
    if (!['Question', 'Answer', 'Post'].includes(targetType)) {
      throw new BadRequestException(
        'Invalid target type. Must be Question, Answer, or Post.',
      );
    }
    if (!isValidObjectId(targetId))
      throw new BadRequestException('Invalid target ID');
    const result = await this.voteService.getMyVote({
      targetType: targetType.toLowerCase(),
      targetId,
      userId: req.user.id,
    });
    return {
      success: true,
      message: 'Vote status fetched successfully',
      data: result,
    };
  }
}
