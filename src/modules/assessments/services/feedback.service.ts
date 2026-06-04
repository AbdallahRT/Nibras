import { ForbiddenException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import type { AuthenticatedUser } from '@modules/auth/types/authenticated-user.type';
import { AssignmentSubmissionStatus } from '@modules/courses/enums/course.enums';
import { CourseAccessService } from '@modules/courses/services/course-access.service';
import {
  BatchFeedbackDto,
  GradeSubmissionDto,
  PeerReviewDto,
} from '../dto/assessments.dto';
import { AssignmentsService } from './assignments.service';

@Injectable()
export class FeedbackService {
  constructor(
    private readonly assignmentsService: AssignmentsService,
    private readonly access: CourseAccessService,
  ) {}

  async grade(
    user: AuthenticatedUser,
    submissionId: string,
    dto: GradeSubmissionDto,
  ) {
    const submission =
      await this.assignmentsService.getSubmissionOrThrow(submissionId);
    const assignment = await this.assignmentsService.getAssignmentOrThrow(
      submission.assignmentId.toString(),
    );
    if (
      !(await this.access.canManageCourseForRequest(
        user,
        assignment.courseId.toString(),
      ))
    ) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Forbidden' });
    }

    if (dto.rubricScores) submission.rubricScores = dto.rubricScores;
    if (dto.score !== undefined) submission.score = dto.score;
    if (dto.textFeedback !== undefined)
      submission.textFeedback = dto.textFeedback;
    if (dto.videoFeedbackUrl !== undefined) {
      submission.videoFeedbackUrl = dto.videoFeedbackUrl;
    }
    submission.status = AssignmentSubmissionStatus.Graded;
    await submission.save();

    return {
      id: submission._id.toString(),
      status: submission.status,
      score: submission.score,
      rubricScores: submission.rubricScores,
      textFeedback: submission.textFeedback,
      videoFeedbackUrl: submission.videoFeedbackUrl,
    };
  }

  async batchFeedback(user: AuthenticatedUser, dto: BatchFeedbackDto) {
    const updated: string[] = [];
    for (const id of dto.submissionIds) {
      const submission = await this.assignmentsService.getSubmissionOrThrow(id);
      const assignment = await this.assignmentsService.getAssignmentOrThrow(
        submission.assignmentId.toString(),
      );
      if (
        !(await this.access.canManageCourseForRequest(
          user,
          assignment.courseId.toString(),
        ))
      ) {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: 'Forbidden',
        });
      }
      submission.textFeedback = dto.message;
      submission.status = AssignmentSubmissionStatus.Graded;
      await submission.save();
      updated.push(id);
    }
    return { updated, count: updated.length };
  }

  async addPeerReview(user: AuthenticatedUser, dto: PeerReviewDto) {
    const submission = await this.assignmentsService.getSubmissionOrThrow(
      dto.submissionId,
    );
    const assignment = await this.assignmentsService.getAssignmentOrThrow(
      submission.assignmentId.toString(),
    );
    if (
      !(await this.access.canViewCourseForRequest(
        user,
        assignment.courseId.toString(),
      ))
    ) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Forbidden' });
    }

    submission.peerReviews.push({
      reviewerId: new Types.ObjectId(user.id),
      feedback: dto.feedback ?? '',
      score: dto.score,
      submittedAt: new Date(),
    });
    await submission.save();

    return { ok: true, peerReviewCount: submission.peerReviews.length };
  }
}
