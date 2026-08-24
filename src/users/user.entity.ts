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

  // type: 'varchar' is explicit (rather than inferred from the TS type via
  // reflect-metadata) because a `string | null` TS type reflects as `Object`,
  // which TypeORM/Postgres reject.
  @Column({ type: 'varchar', nullable: true })
  avatarUrl: string | null;

  /** Storage key/path of the current avatar file, used to delete it on replace/removal. */
  @Column({ type: 'varchar', nullable: true, select: false })
  avatarKey: string | null;

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
