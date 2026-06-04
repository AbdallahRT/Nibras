import {
  Body,
  Controller,
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
  CreateTestCaseDto,
  ImportTestCasesDto,
  UpdateTestCaseDto,
} from '../dto/assessments.dto';
import { TestCasesService } from '../services/test-cases.service';

@ApiTags('test-cases')
@ApiBearerAuth('session')
@ApiCookieAuth('nibras_web_session')
@Controller()
@UseGuards(SessionAuthGuard)
export class TestCasesController {
  constructor(private readonly testCasesService: TestCasesService) {}

  @Get('assignments/:assignmentId/test-cases')
  @ApiOperation({ summary: 'List test cases for assignment' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.testCasesService.list(user, assignmentId, false);
  }

  @Post('assignments/:assignmentId/test-cases')
  @ApiOperation({ summary: 'Add test case (instructor)' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('assignmentId') assignmentId: string,
    @Body() dto: CreateTestCaseDto,
  ) {
    return this.testCasesService.create(user, assignmentId, dto);
  }

  @Post('assignments/:assignmentId/test-cases/import')
  @ApiOperation({ summary: 'Batch import test cases' })
  importBatch(
    @CurrentUser() user: AuthenticatedUser,
    @Param('assignmentId') assignmentId: string,
    @Body() dto: ImportTestCasesDto,
  ) {
    return this.testCasesService.importBatch(user, assignmentId, dto);
  }

  @Patch('test-cases/:testCaseId')
  @ApiOperation({ summary: 'Update test case' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('testCaseId') testCaseId: string,
    @Body() dto: UpdateTestCaseDto,
  ) {
    return this.testCasesService.update(user, testCaseId, dto);
  }
}
