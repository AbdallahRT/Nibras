import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import type { AuthenticatedUser } from '@modules/auth/types/authenticated-user.type';
import { CourseAccessService } from '@modules/courses/services/course-access.service';
import { AssignmentsService } from './assignments.service';

@Injectable()
export class StyleAnalysisService {
  constructor(
    private readonly assignmentsService: AssignmentsService,
    private readonly access: CourseAccessService,
  ) {}

  async generateReport(user: AuthenticatedUser, submissionId: string) {
    const submission =
      await this.assignmentsService.getSubmissionOrThrow(submissionId);
    const assignment = await this.assignmentsService.getAssignmentOrThrow(
      submission.assignmentId.toString(),
    );
    const courseId = assignment.courseId.toString();

    const canView =
      submission.userId.toString() === user.id ||
      (await this.access.canManageCourseForRequest(user, courseId));
    if (!canView) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Submission not found',
      });
    }

    const lang = (submission.language ?? 'javascript').toLowerCase();
    const code = submission.code ?? '';
    if (!code.trim()) {
      throw new NotFoundException({
        code: 'NO_CODE',
        message: 'No code to analyze',
      });
    }

    const report = this.runLinter(lang, code);
    submission.styleReport = report;
    await submission.save();
    return report;
  }

  async getStyleReport(user: AuthenticatedUser, submissionId: string) {
    const submission =
      await this.assignmentsService.getSubmissionOrThrow(submissionId);
    if (!submission.styleReport) {
      return this.generateReport(user, submissionId);
    }
    return submission.styleReport;
  }

  private runLinter(language: string, code: string) {
    const workDir = join(tmpdir(), `nibras-style-${randomUUID()}`);
    mkdirSync(workDir, { recursive: true });

    try {
      if (language === 'python' || language === 'py') {
        writeFileSync(join(workDir, 'main.py'), code, 'utf8');
        const result = spawnSync('python3', ['-m', 'py_compile', 'main.py'], {
          cwd: workDir,
          encoding: 'utf8',
        });
        const issues =
          result.status !== 0
            ? [{ rule: 'syntax', message: result.stderr || 'Syntax error' }]
            : [];
        return {
          generatedAt: new Date(),
          issues: { pylint: issues },
          issueCount: issues.length,
        };
      }

      if (language === 'javascript' || language === 'js') {
        writeFileSync(join(workDir, 'main.js'), code, 'utf8');
        const result = spawnSync('node', ['--check', 'main.js'], {
          cwd: workDir,
          encoding: 'utf8',
        });
        const issues =
          result.status !== 0
            ? [{ rule: 'syntax', message: result.stderr || 'Syntax error' }]
            : [];
        return {
          generatedAt: new Date(),
          issues: { eslint: issues },
          issueCount: issues.length,
        };
      }

      throw new ServiceUnavailableException({
        code: 'STYLE_UNSUPPORTED',
        message: `Style analysis not configured for language: ${language}`,
      });
    } finally {
      try {
        rmSync(workDir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  }
}
