import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { isValidObjectId } from 'mongoose';
import { SessionAuthGuard } from '@common/guards/auth.guards';
import { QuestionService } from '../services/question.service';
import { AnswerService } from '../services/answer.service';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@modules/auth/types/authenticated-user.type';
import { CreateQuestionDto, UpdateQuestionDto } from '../dto/question.dto';
import { PaginationQueryDto } from '../dto/pagination-query.dto';

@ApiTags('Questions')
@UseGuards(SessionAuthGuard)
@Controller('questions')
export class QuestionController {
  constructor(
    private questionService: QuestionService,
    private answerService: AnswerService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a question' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateQuestionDto,
  ) {
    const question = await this.questionService.create({
      ...dto,
      author: user.id,
    });
    return {
      success: true,
      message: 'Question created successfully',
      data: { question },
    };
  }

  @Get()
  @ApiOperation({ summary: 'List questions' })
  async findAll(
    @Query()
    query: PaginationQueryDto & {
      search?: string;
      title?: string;
      tag?: string;
      course?: string;
    },
  ) {
    const result = await this.questionService.findAll(query);
    return {
      success: true,
      message: 'Questions fetched successfully',
      data: result,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single question with answers' })
  async findById(@Param('id') id: string) {
    if (!isValidObjectId(id))
      throw new BadRequestException('Invalid question ID');
    const question = await this.questionService.findById(id);
    if (!question) throw new NotFoundException('Question not found');
    const { answers, pagination: answerPagination } =
      await this.answerService.findByQuestion(id);
    return {
      success: true,
      message: 'Question fetched successfully',
      data: { question, answers, answerPagination },
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update question' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateQuestionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!isValidObjectId(id))
      throw new BadRequestException('Invalid question ID');
    const question = await this.questionService.findById(id);
    if (!question) throw new NotFoundException('Question not found');
    const authorId = question.author._id;

    if (String(authorId) !== String(user.id)) {
      throw new ForbiddenException(
        'You are not allowed to update this question',
      );
    }
    const updated = await this.questionService.update(id, dto);
    return {
      success: true,
      message: 'Question updated successfully',
      data: { question: updated },
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete question' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!isValidObjectId(id))
      throw new BadRequestException('Invalid question ID');
    const question = await this.questionService.findById(id);
    if (!question) throw new NotFoundException('Question not found');
    const authorId = question.author._id;
    if (String(authorId) !== String(user.id)) {
      throw new ForbiddenException(
        'You are not allowed to delete this question',
      );
    }
    await this.questionService.delete(id);
    return { success: true, message: 'Question deleted successfully' };
  }
}
