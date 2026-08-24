import { IsEnum, IsInt, IsObject, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { ActivityType } from './progress.entity';

const MAX_SCORE = 1_000_000;

export class RecordProgressDto {
  @IsUUID('4', { message: 'challengeId must be a valid UUID' })
  challengeId: string;

  @IsEnum(ActivityType)
  activityType: ActivityType;

  @IsInt()
  @Min(0)
  @Max(MAX_SCORE, { message: `score must not exceed ${MAX_SCORE}` })
  score: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
