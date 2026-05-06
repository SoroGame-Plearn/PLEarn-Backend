import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, CreateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum RewardStatus {
  PENDING = 'pending',
  DISTRIBUTED = 'distributed',
  FAILED = 'failed',
}

@Entity('rewards')
export class Reward {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (u) => u.rewards, { onDelete: 'CASCADE' })
  user: User;

  @Column({ type: 'decimal', precision: 18, scale: 7 })
  amount: number;

  @Column({ type: 'enum', enum: RewardStatus, default: RewardStatus.PENDING })
  status: RewardStatus;

  @Column({ nullable: true })
  txHash: string;

  @Column({ nullable: true })
  reason: string;

  @CreateDateColumn()
  createdAt: Date;
}
