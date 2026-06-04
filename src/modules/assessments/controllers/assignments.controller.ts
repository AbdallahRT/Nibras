import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
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
  CreateAssignmentDto,
  SubmitAssignmentDto,
  UpdateAssignmentDto,
  UpsertRubricDto,
} from '../dto/assessments.dto';
import { AssignmentsService } from '../services/assignments.service';
import { EvaluationService } from '../services/evaluation.service';
import { MossService } from '../services/moss.service';
import { RubricsService } from '../services/rubrics.service';

@Controller('courses')
@ApiTags('courses')
@ApiBearerAuth('session')
@ApiCookieAuth('nibras_web_session')
@UseGuards(SessionAuthGuard)
export class CourseAssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get(':courseId/assignments')
  @ApiOperation({ summary: 'List assignments for a course' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId') courseId: string,
  ) {
    return this.assignmentsService.listForCourse(user, courseId);
  }

  @Post(':courseId/assignments')
  @ApiOperation({ summary: 'Create assignment (instructor)' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId') courseId: string,
    @Body() dto: CreateAssignmentDto,
  ) {
    return this.assignmentsService.create(user, courseId, dto);
  }

  @Patch(':courseId/assignments/:assignmentId')
  @ApiOperation({ summary: 'Update assignment (instructor)' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId') courseId: string,
    @Param('assignmentId') assignmentId: string,
    @Body() dto: UpdateAssignmentDto,
  ) {
    return this.assignmentsService.update(user, courseId, assignmentId, dto);
  }

  @Delete(':courseId/assignments/:assignmentId')
  @ApiOperation({ summary: 'Delete assignment (instructor)' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId') courseId: string,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.assignmentsService.delete(user, courseId, assignmentId);
  }
}

@Controller('assignments')
@ApiTags('assignments')
@ApiBearerAuth('session')
@ApiCookieAuth('nibras_web_session')
@UseGuards(SessionAuthGuard)
export class AssignmentsController {
  constructor(
    private readonly assignmentsService: AssignmentsService,
    private readonly evaluationService: EvaluationService,
    private readonly rubricsService: RubricsService,
    private readonly mossService: MossService,
  ) {}

  @Get(':assignmentId')
  @ApiOperation({ summary: 'Get assignment detail' })
  detail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.assignmentsService.getDetail(user, assignmentId);
  }

  @Get(':assignmentId/submissions')
  @ApiOperation({ summary: 'List submissions (instructor)' })
  listSubmissions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.assignmentsService.listSubmissions(user, assignmentId);
  }

  @Post(':assignmentId/submit')
  @ApiOperation({ summary: 'Submit assignment' })
  submit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('assignmentId') assignmentId: string,
    @Body() dto: SubmitAssignmentDto,
  ) {
    return this.assignmentsService.submit(user, assignmentId, dto);
  }

  @Post(':assignmentId/evaluate')
  @ApiOperation({ summary: 'Evaluate submission against test cases' })
  evaluate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.evaluationService.evaluate(user, assignmentId);
  }

  @Post(':assignmentId/rubric')
  @ApiOperation({ summary: 'Upsert rubric for assignment' })
  upsertRubric(
    @CurrentUser() user: AuthenticatedUser,
    @Param('assignmentId') assignmentId: string,
    @Body() dto: UpsertRubricDto,
  ) {
    return this.rubricsService.upsert(user, assignmentId, dto);
  }

  @Get(':assignmentId/rubric')
  @ApiOperation({ summary: 'Get rubric for assignment' })
  getRubric(
    @CurrentUser() user: AuthenticatedUser,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.rubricsService.get(user, assignmentId);
  }

  @Post(':assignmentId/plagiarism-check')
  @ApiOperation({ summary: 'Run plagiarism check on all submissions' })
  plagiarismCheck(
    @CurrentUser() user: AuthenticatedUser,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.mossService.runPlagiarismCheck(user, assignmentId);
  }

  @Get(':assignmentId/plagiarism-report')
  @ApiOperation({ summary: 'Get plagiarism similarity report' })
  plagiarismReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.mossService.getPlagiarismReport(user, assignmentId);
  }
}
