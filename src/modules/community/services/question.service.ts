import { Model, Types, SortOrder } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Question } from '../schemas/question.schema';
import { Answer } from '../schemas/answer.schema';
import { Tag } from '../schemas/tag.schema';
import { TagService } from './tag.service';
import {
  IRealtimeEvents,
  IActivityEventService,
} from '../interfaces/external-services.interface';
import { PopulatedQuestion, PopulatedTag } from '../interfaces/populated.types';
import { PaginationMeta } from '../interfaces/service-return.types';

function normalizePagination(page?: number, limit?: number) {
  const p = Math.max(Number(page) || 1, 1);
  const l = Math.min(Math.max(Number(limit) || 20, 1), 100);
  return { page: p, limit: l, skip: (p - 1) * l };
}

function extractTagNames(tags: PopulatedTag[] | Types.ObjectId[]): string[] {
  if (!tags || tags.length === 0) return [];
  return tags.map((t) => {
    if ('name' in (t as unknown as Record<string, unknown>)) {
      return (t as PopulatedTag).name ?? String((t as PopulatedTag)._id);
    }
    if (t instanceof Types.ObjectId) return t.toString();
    return '';
  });
}

@Injectable()
export class QuestionService {
  constructor(
    @InjectModel(Question.name) private questionModel: Model<Question>,
    @InjectModel(Answer.name) private answerModel: Model<Answer>,
    @InjectModel(Tag.name) private tagModel: Model<Tag>,
    private tagService: TagService,
  ) {}

  setRealtimeEvents(events: IRealtimeEvents) {
    this.realtimeEvents = events;
  }
  private realtimeEvents?: IRealtimeEvents;

  setActivityEventService(service: IActivityEventService) {
    this.activityEventService = service;
  }
  private activityEventService?: IActivityEventService;

  async create(data: {
    title: string;
    body: string;
    author: string;
    tags?: string[];
    course?: string;
  }) {
    const tagIds: Types.ObjectId[] = [];
    if (data.tags?.length) {
      for (const tagName of data.tags) {
        try {
          const tagId = await this.tagService.getTagIdByName(tagName);
          tagIds.push(new Types.ObjectId(tagId));
        } catch {
          /* skip */
        }
      }
      if (tagIds.length) {
        await this.tagModel.updateMany(
          { _id: { $in: tagIds } },
          { $inc: { usageCount: 1 } },
        );
      }
    }

    const question = await this.questionModel.create({
      author: data.author,
      course: data.course,
      title: data.title,
      body: data.body,
      tags: tagIds,
    });

    const populated = await this.questionModel
      .findById(question._id)
      .populate('author')
      .populate('tags')
      .lean<PopulatedQuestion>();

    if (!populated) throw new Error('Failed to retrieve created question');

    const result: Omit<PopulatedQuestion, 'tags'> & { tags: string[] } = {
      ...populated,
      tags: extractTagNames(populated.tags),
    };

    this.realtimeEvents?.emitQuestionCreated(result);
    await this.activityEventService?.recordQuestionCreated({
      userId: populated.author?._id ?? populated.author,
      questionId: populated._id,
      courseId:
        (populated.course as { _id: Types.ObjectId })?._id ??
        populated.course ??
        null,
      occurredAt: populated.createdAt,
      roleSnapshot: populated.author?.role?.name ?? null,
    });

    return result;
  }

  async findAll(filters: {
    page?: number;
    limit?: number;
    search?: string;
    title?: string;
    tag?: string;
    course?: string;
  }): Promise<{
    questions: (Omit<PopulatedQuestion, 'tags'> & { tags: string[] })[];
    pagination: PaginationMeta;
  }> {
    const query: Record<string, unknown> = {};
    const { page, limit, skip } = normalizePagination(
      filters.page,
      filters.limit,
    );

    if (filters.search) query.$text = { $search: filters.search };
    if (filters.title) query.title = { $regex: filters.title, $options: 'i' };
    if (filters.tag) {
      const tag = await this.tagService.getTagByName(filters.tag);
      query.tags = tag ? tag._id : { $size: 0 };
    }
    if (filters.course) query.course = new Types.ObjectId(filters.course);

    const sortOptions: Record<string, SortOrder | { $meta: 'textScore' }> = {
      createdAt: -1,
    };
    if (filters.search) sortOptions.score = { $meta: 'textScore' };

    const [questions, total] = await Promise.all([
      this.questionModel
        .find(query)
        .populate('author')
        .populate('course')
        .populate('tags')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean<PopulatedQuestion[]>(),
      this.questionModel.countDocuments(query),
    ]);

    const data: (Omit<PopulatedQuestion, 'tags'> & { tags: string[] })[] =
      questions.map((q) => ({
        ...q,
        tags: extractTagNames(q.tags),
      }));

    return {
      questions: data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findById(
    id: string,
  ): Promise<(Omit<PopulatedQuestion, 'tags'> & { tags: string[] }) | null> {
    const question = await this.questionModel
      .findById(id)
      .populate('author')
      .populate('course')
      .populate('tags')
      .lean<PopulatedQuestion>();

    if (!question) return null;
    return { ...question, tags: extractTagNames(question.tags) };
  }

  async update(
    id: string,
    data: { title?: string; body?: string; tags?: string[]; course?: string },
  ): Promise<(Omit<PopulatedQuestion, 'tags'> & { tags: string[] }) | null> {
    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.body !== undefined) updateData.body = data.body;
    if (data.course !== undefined) updateData.course = data.course;

    if (data.tags) {
      const oldQuestion = await this.questionModel
        .findById(id)
        .lean<{ tags?: Types.ObjectId[] }>();
      const oldTagIds = oldQuestion ? (oldQuestion.tags ?? []).map(String) : [];

      const newTagIds: Types.ObjectId[] = [];
      for (const tagName of data.tags) {
        try {
          const tagId = await this.tagService.getTagIdByName(tagName);
          newTagIds.push(new Types.ObjectId(tagId));
        } catch {
          /* skip */
        }
      }

      const added = newTagIds.filter((tid) => !oldTagIds.includes(String(tid)));
      const removed = oldTagIds.filter(
        (old: string) => !newTagIds.some((n) => String(n) === old),
      );

      if (added.length)
        await this.tagModel.updateMany(
          { _id: { $in: added } },
          { $inc: { usageCount: 1 } },
        );
      if (removed.length)
        await this.tagModel.updateMany(
          { _id: { $in: removed } },
          { $inc: { usageCount: -1 } },
        );

      updateData.tags = newTagIds;
    }

    const updated = await this.questionModel
      .findByIdAndUpdate(id, updateData, { returnDocument: 'after' })
      .populate('author')
      .populate('course')
      .populate('tags')
      .lean<PopulatedQuestion>();

    if (!updated) return null;
    return { ...updated, tags: extractTagNames(updated.tags) };
  }

  async delete(id: string) {
    const question = await this.questionModel
      .findById(id)
      .lean<{ tags?: Types.ObjectId[] }>();
    if (question?.tags?.length) {
      await this.tagModel.updateMany(
        { _id: { $in: question.tags } },
        { $inc: { usageCount: -1 } },
      );
    }
    await this.answerModel.deleteMany({ question: id });
    return this.questionModel.findByIdAndDelete(id);
  }
}
