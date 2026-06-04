import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { AuthenticatedUser } from '@modules/auth/types/authenticated-user.type';
import { CourseAccessService } from '@modules/courses/services/course-access.service';
import {
  PlagiarismReport,
  SimilarityPair,
} from '../schemas/plagiarism-report.schema';
import { AssignmentSubmission } from '../schemas/assignment-submission.schema';
import { AssignmentsService } from './assignments.service';

@Injectable()
export class MossService {
  constructor(
    @InjectModel(PlagiarismReport.name)
    private readonly reportModel: Model<PlagiarismReport>,
    @InjectModel(AssignmentSubmission.name)
    private readonly submissionModel: Model<AssignmentSubmission>,
    private readonly assignmentsService: AssignmentsService,
    private readonly access: CourseAccessService,
    private readonly config: ConfigService,
  ) {}

  private mossConfigured(): boolean {
    return Boolean(this.config.get<string>('moss.userId'));
  }

  async runPlagiarismCheck(user: AuthenticatedUser, assignmentId: string) {
    const assignment =
      await this.assignmentsService.getAssignmentOrThrow(assignmentId);
    if (
      !(await this.access.canManageCourseForRequest(
        user,
        assignment.courseId.toString(),
      ))
    ) {
      throw new ServiceUnavailableException({
        code: 'FORBIDDEN',
        message: 'Instructor access required',
      });
    }

    const subs = await this.submissionModel
      .find({ assignmentId: assignment._id, code: { $exists: true, $ne: '' } })
      .exec();

    const pairs: SimilarityPair[] = [];
    for (let i = 0; i < subs.length; i++) {
      for (let j = i + 1; j < subs.length; j++) {
        const similarity = this.tokenSimilarity(
          subs[i].code ?? '',
          subs[j].code ?? '',
        );
        pairs.push({
          submissionAId: subs[i]._id,
          submissionBId: subs[j]._id,
          similarityPercent: similarity,
          flagged: similarity >= 70,
        });
      }
    }

    const report = await this.reportModel.findOneAndUpdate(
      { assignmentId: assignment._id },
      {
        $set: {
          checkedAt: new Date(),
          pairs,
          mossReportUrl: this.mossConfigured()
            ? `moss://assignment/${assignmentId}`
            : undefined,
        },
      },
      { upsert: true, new: true },
    );

    return {
      assignmentId,
      checkedAt: report.checkedAt.toISOString(),
      pairCount: pairs.length,
      flaggedCount: pairs.filter((p) => p.flagged).length,
      mode: this.mossConfigured() ? 'moss_stub' : 'local_token_similarity',
    };
  }

  async getPlagiarismReport(user: AuthenticatedUser, assignmentId: string) {
    const assignment =
      await this.assignmentsService.getAssignmentOrThrow(assignmentId);
    if (
      !(await this.access.canManageCourseForRequest(
        user,
        assignment.courseId.toString(),
      ))
    ) {
      throw new ServiceUnavailableException({
        code: 'FORBIDDEN',
        message: 'Forbidden',
      });
    }

    const report = await this.reportModel
      .findOne({ assignmentId: assignment._id })
      .exec();
    if (!report) {
      return { pairs: [], matrix: [] };
    }

    const matrix = report.pairs.map((p) => ({
      submissionAId: p.submissionAId.toString(),
      submissionBId: p.submissionBId.toString(),
      similarityPercent: p.similarityPercent,
      flagged: p.flagged,
    }));

    return {
      assignmentId,
      checkedAt: report.checkedAt.toISOString(),
      mossReportUrl: report.mossReportUrl,
      pairs: matrix,
      matrix,
    };
  }

  /** Simple Jaccard token overlap when MOSS API is not configured. */
  private tokenSimilarity(a: string, b: string): number {
    const tokensA = new Set(a.split(/\s+/).filter(Boolean));
    const tokensB = new Set(b.split(/\s+/).filter(Boolean));
    if (!tokensA.size || !tokensB.size) return 0;
    let intersection = 0;
    for (const t of tokensA) {
      if (tokensB.has(t)) intersection += 1;
    }
    const union = new Set([...tokensA, ...tokensB]).size;
    return Math.round((intersection / union) * 100);
  }
}
