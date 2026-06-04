import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { SessionAuthGuard } from '@common/guards/auth.guards';
import type { AuthenticatedUser } from '@modules/auth/types/authenticated-user.type';
import {
  BatchFeedbackDto,
  GradeSubmissionDto,
  PeerReviewDto,
} from '../dto/assessments.dto';
import { FeedbackService } from '../services/feedback.service';
import { StyleAnalysisService } from '../services/style-analysis.service';

@ApiTags('assignment-submissions')
@ApiBearerAuth('session')
@ApiCookieAuth('nibras_web_session')
@Controller('submissions')
@UseGuards(SessionAuthGuard)
export class SubmissionsController {
  constructor(
    private readonly feedbackService: FeedbackService,
    private readonly styleService: StyleAnalysisService,
  ) {}

  @Post(':submissionId/grade')
  @ApiOperation({ summary: 'Grade submission with rubric scores' })
  grade(
    @CurrentUser() user: AuthenticatedUser,
    @Param('submissionId') submissionId: string,
    @Body() dto: GradeSubmissionDto,
  ) {
    return this.feedbackService.grade(user, submissionId, dto);
  }

  @Post(':submissionId/feedback')
  @ApiOperation({ summary: 'Batch feedback distribution' })
  batchFeedback(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BatchFeedbackDto,
  ) {
    return this.feedbackService.batchFeedback(user, dto);
  }

  @Get(':submissionId/style-report')
  @ApiOperation({ summary: 'Get code style analysis report' })
  styleReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('submissionId') submissionId: string,
  ) {
    return this.styleService.getStyleReport(user, submissionId);
  }

  @Post('peer-review')
  @ApiOperation({ summary: 'Submit peer review' })
  peerReview(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PeerReviewDto,
  ) {
    return this.feedbackService.addPeerReview(user, dto);
  }
}
