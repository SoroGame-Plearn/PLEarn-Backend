import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProgressEntry } from './progress.entity';
import { RecordProgressDto } from './progress.dto';
import { UsersService } from '../users/users.service';
import { RewardsService } from '../rewards/rewards.service';

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(ProgressEntry) private readonly repo: Repository<ProgressEntry>,
    private readonly usersService: UsersService,
    private readonly rewardsService: RewardsService,
  ) {}

  async record(userId: string, dto: RecordProgressDto): Promise<ProgressEntry> {
    const existing = await this.repo.findOne({
      where: { user: { id: userId }, challengeId: dto.challengeId },
    });
    if (existing) throw new ConflictException('Challenge already completed');

    const user = await this.usersService.findById(userId);
    const entry = this.repo.create({ ...dto, user });
    const saved = await this.repo.save(entry);

    // Update total score and trigger reward check
    await this.usersService.update(userId, { totalScore: user.totalScore + dto.score } as any);
    await this.rewardsService.evaluateReward(userId, dto.score);

    return saved;
  }

  async getUserProgress(userId: string): Promise<ProgressEntry[]> {
    return this.repo.find({
      where: { user: { id: userId } },
      order: { completedAt: 'DESC' },
    });
  }

  async getActivityLog(userId: string, limit = 20): Promise<ProgressEntry[]> {
    return this.repo.find({
      where: { user: { id: userId } },
      order: { completedAt: 'DESC' },
      take: limit,
    });
  }
}
