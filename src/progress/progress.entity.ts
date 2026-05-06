import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, CreateDateColumn, Index,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum ActivityType {
  CHALLENGE_COMPLETED = 'challenge_completed',
  LESSON_COMPLETED = 'lesson_completed',
  QUIZ_PASSED = 'quiz_passed',
}

@Entity('progress_entries')
@Index(['user', 'challengeId'], { unique: true })
export class ProgressEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (u) => u.progress, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  challengeId: string;

  @Column({ type: 'enum', enum: ActivityType })
  activityType: ActivityType;

  @Column({ default: 0 })
  score: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @CreateDateColumn()
  completedAt: Date;
}
