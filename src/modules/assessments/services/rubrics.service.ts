import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { AuthenticatedUser } from '@modules/auth/types/authenticated-user.type';
import { CourseAccessService } from '@modules/courses/services/course-access.service';
import { UpsertRubricDto } from '../dto/assessments.dto';
import { Rubric } from '../schemas/rubric.schema';
import { AssignmentsService } from './assignments.service';

@Injectable()
export class RubricsService {
  constructor(
    @InjectModel(Rubric.name) private readonly rubricModel: Model<Rubric>,
    private readonly assignmentsService: AssignmentsService,
    private readonly access: CourseAccessService,
  ) {}

  async upsert(
    user: AuthenticatedUser,
    assignmentId: string,
    dto: UpsertRubricDto,
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

    const rubric = await this.rubricModel
      .findOneAndUpdate(
        { assignmentId: assignment._id },
        { $set: { criteria: dto.criteria } },
        { upsert: true, new: true },
      )
      .exec();

    assignment.rubricId = rubric._id;
    await assignment.save();

    return {
      id: rubric._id.toString(),
      assignmentId,
      criteria: rubric.criteria,
    };
  }

  async get(user: AuthenticatedUser, assignmentId: string) {
    const assignment =
      await this.assignmentsService.getAssignmentOrThrow(assignmentId);
    if (
      !(await this.access.canViewCourseForRequest(
        user,
        assignment.courseId.toString(),
      ))
    ) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Forbidden' });
    }
    const rubric = await this.rubricModel
      .findOne({ assignmentId: assignment._id })
      .exec();
    if (!rubric) return { criteria: [] };
    return {
      id: rubric._id.toString(),
      assignmentId,
      criteria: rubric.criteria,
    };
  }
}
