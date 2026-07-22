import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToMany,
} from 'typeorm';
import { ProgressEntry } from '../progress/progress.entity';
import { Reward } from '../rewards/reward.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  username: string;

  @Column({ select: false })
  passwordHash: string;

  @Column({ nullable: true })
  stellarPublicKey: string;

  @Column({ default: 0 })
  totalScore: number;

  @Column({ nullable: true, unique: true, select: false })
  refreshToken: string;

  @Column({ nullable: true, select: false })
  refreshTokenExpiresAt: Date;

  @Column({ default: false, select: false })
  isRefreshTokenRevoked: boolean;

  @OneToMany(() => ProgressEntry, (p) => p.user)
  progress: ProgressEntry[];

  @OneToMany(() => Reward, (r) => r.user)
  rewards: Reward[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
