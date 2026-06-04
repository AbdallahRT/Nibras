import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { AuthenticatedUser } from '@modules/auth/types/authenticated-user.type';
import { CourseAccessService } from '@modules/courses/services/course-access.service';
import {
  CreateTestCaseDto,
  ImportTestCasesDto,
  UpdateTestCaseDto,
} from '../dto/assessments.dto';
import { TestCase, TestCaseDocument } from '../schemas/test-case.schema';
import { AssignmentsService } from './assignments.service';

@Injectable()
export class TestCasesService {
  constructor(
    @InjectModel(TestCase.name) private readonly testCaseModel: Model<TestCase>,
    private readonly assignmentsService: AssignmentsService,
    private readonly access: CourseAccessService,
  ) {}

  private present(tc: TestCaseDocument) {
    return {
      id: tc._id.toString(),
      assignmentId: tc.assignmentId.toString(),
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      isHidden: tc.isHidden,
      weight: tc.weight,
      timeLimit: tc.timeLimit,
      memoryLimit: tc.memoryLimit,
    };
  }

  async list(
    user: AuthenticatedUser,
    assignmentId: string,
    includeHidden: boolean,
  ) {
    const assignment =
      await this.assignmentsService.getAssignmentOrThrow(assignmentId);
    const courseId = assignment.courseId.toString();
    if (!(await this.access.canViewCourseForRequest(user, courseId))) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Forbidden' });
    }

    const isManager = await this.access.canManageCourseForRequest(
      user,
      courseId,
    );
    const filter: Record<string, unknown> = {
      assignmentId: assignment._id,
    };
    if (!includeHidden && !isManager) {
      filter.isHidden = false;
    }

    const rows = await this.testCaseModel
      .find(filter)
      .sort({ createdAt: 1 })
      .exec();
    return { items: rows.map((r) => this.present(r)) };
  }

  async create(
    user: AuthenticatedUser,
    assignmentId: string,
    dto: CreateTestCaseDto,
  ) {
    const assignment =
      await this.assignmentsService.getAssignmentOrThrow(assignmentId);
    if (
      !(await this.access.canManageCourseForRequest(
        user,
        assignment.courseId.toString(),
      ))
    ) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Forbidden' });
    }

    const row = await this.testCaseModel.create({
      assignmentId: assignment._id,
      input: dto.input,
      expectedOutput: dto.expectedOutput,
      isHidden: dto.isHidden ?? false,
      weight: dto.weight ?? 1,
      timeLimit: dto.timeLimit ?? assignment.resourceLimits?.timeMs ?? 5000,
      memoryLimit:
        dto.memoryLimit ?? assignment.resourceLimits?.memoryMb ?? 256,
    });
    return this.present(row);
  }

  async update(
    user: AuthenticatedUser,
    testCaseId: string,
    dto: UpdateTestCaseDto,
  ) {
    const row = await this.testCaseModel.findById(testCaseId).exec();
    if (!row) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Test case not found',
      });
    }
    const assignment = await this.assignmentsService.getAssignmentOrThrow(
      row.assignmentId.toString(),
    );
    if (
      !(await this.access.canManageCourseForRequest(
        user,
        assignment.courseId.toString(),
      ))
    ) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Forbidden' });
    }

    if (dto.input !== undefined) row.input = dto.input;
    if (dto.expectedOutput !== undefined)
      row.expectedOutput = dto.expectedOutput;
    if (dto.isHidden !== undefined) row.isHidden = dto.isHidden;
    if (dto.weight !== undefined) row.weight = dto.weight;
    if (dto.timeLimit !== undefined) row.timeLimit = dto.timeLimit;
    if (dto.memoryLimit !== undefined) row.memoryLimit = dto.memoryLimit;
    await row.save();
    return this.present(row);
  }

  async importBatch(
    user: AuthenticatedUser,
    assignmentId: string,
    dto: ImportTestCasesDto,
  ) {
    const created = [];
    for (const item of dto.cases) {
      created.push(await this.create(user, assignmentId, item));
    }
    return { items: created, count: created.length };
  }

  async listForEvaluation(
    assignmentId: Types.ObjectId,
    includeHidden: boolean,
  ): Promise<TestCaseDocument[]> {
    const filter: Record<string, unknown> = { assignmentId };
    if (!includeHidden) filter.isHidden = false;
    return this.testCaseModel.find(filter).exec();
  }
}
