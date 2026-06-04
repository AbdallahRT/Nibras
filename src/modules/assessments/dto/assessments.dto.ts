import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { AssignmentType } from '@modules/courses/enums/course.enums';

export class ResourceLimitsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  cpuCores?: number;

  @ApiPropertyOptional({ default: 256 })
  @IsOptional()
  @IsInt()
  @Min(32)
  @Max(512)
  memoryMb?: number;

  @ApiPropertyOptional({ default: 5000 })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(60000)
  timeMs?: number;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  diskMb?: number;
}

export class CreateAssignmentDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50000)
  content?: string;

  @ApiPropertyOptional({ enum: AssignmentType })
  @IsOptional()
  @IsEnum(AssignmentType)
  type?: AssignmentType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  configJson?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dueAt?: string;

  @ApiPropertyOptional({ default: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  pointsPossible?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => ResourceLimitsDto)
  resourceLimits?: ResourceLimitsDto;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateAssignmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ enum: AssignmentType })
  @IsOptional()
  @IsEnum(AssignmentType)
  type?: AssignmentType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  configJson?: Record<string, unknown>;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  dueAt?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  pointsPossible?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => ResourceLimitsDto)
  resourceLimits?: ResourceLimitsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class CreateTestCaseDto {
  @ApiProperty()
  @IsString()
  input!: string;

  @ApiProperty()
  @IsString()
  expectedOutput!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isHidden?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  weight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  timeLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  memoryLimit?: number;
}

export class UpdateTestCaseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  input?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  expectedOutput?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isHidden?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  weight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  timeLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  memoryLimit?: number;
}

export class RubricLevelDto {
  @IsString()
  label!: string;

  @IsString()
  description!: string;

  @IsNumber()
  points!: number;
}

export class RubricCriterionDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  maxPoints!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RubricLevelDto)
  levels!: RubricLevelDto[];
}

export class UpsertRubricDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RubricCriterionDto)
  criteria!: RubricCriterionDto[];
}

export class SubmitAssignmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  fileUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  answers?: Record<string, string>;
}

export class RubricScoreDto {
  @IsString()
  criterionName!: string;

  @IsString()
  levelLabel!: string;

  @IsNumber()
  points!: number;
}

export class GradeSubmissionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RubricScoreDto)
  rubricScores?: RubricScoreDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  score?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  textFeedback?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  videoFeedbackUrl?: string;
}

export class BatchFeedbackDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  submissionIds!: string[];

  @ApiProperty()
  @IsString()
  @MaxLength(10000)
  message!: string;
}

export class PeerReviewDto {
  @ApiProperty()
  @IsString()
  submissionId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feedback?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  score?: number;
}

export class ImportTestCasesDto {
  @ApiProperty({ type: 'array', items: { type: 'object' } })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTestCaseDto)
  cases!: CreateTestCaseDto[];
}
