import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SubmissionStatus } from '../enums/competition.enums';
import { Problem } from '../schemas/problem.schema';
import { Submission } from '../schemas/submission.schema';

@Injectable()
export class JudgeService {
  constructor(
    @InjectModel(Submission.name)
    private readonly submissionModel: Model<Submission>,
    @InjectModel(Problem.name) private readonly problemModel: Model<Problem>,
  ) {}

  async judgeSubmission(submissionId: string): Promise<SubmissionStatus> {
    const submission = await this.submissionModel.findById(submissionId).exec();
    if (!submission) return SubmissionStatus.RuntimeError;

    const problem = await this.problemModel
      .findById(submission.problemId)
      .exec();
    if (!problem?.testCases?.length) {
      submission.status = SubmissionStatus.Accepted;
      submission.score = 100;
      await submission.save();
      return submission.status;
    }

    const hidden = problem.testCases.filter((t) => !t.isSample);
    const tests = hidden.length > 0 ? hidden : problem.testCases;

    try {
      if (submission.language === 'javascript') {
        for (const tc of tests) {
          // Stub judge: in-process eval for MVP; replace with sandbox runner later.
          // eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call
          const out = new Function(
            'input',
            `${submission.code}; return solve(input);`,
          )(tc.input.trim()) as unknown;
          const expected = tc.expectedOutput.trim();
          if (String(out).trim() !== expected) {
            submission.status = SubmissionStatus.WrongAnswer;
            await submission.save();
            return submission.status;
          }
        }
        submission.status = SubmissionStatus.Accepted;
        submission.score = 100;
        submission.runtime = 10;
        submission.memory = 1024;
      } else {
        submission.status = SubmissionStatus.RuntimeError;
      }
    } catch {
      submission.status = SubmissionStatus.RuntimeError;
    }

    await submission.save();
    return submission.status;
  }
}
