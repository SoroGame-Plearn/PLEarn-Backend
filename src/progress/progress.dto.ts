import { IsString, IsEnum, IsInt, Min, IsOptional, IsObject } from 'class-validator';
import { ActivityType } from './progress.entity';

export class RecordProgressDto {
  @IsString()
  challengeId: string;

  @IsEnum(ActivityType)
  activityType: ActivityType;

  @IsInt()
  @Min(0)
  score: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
