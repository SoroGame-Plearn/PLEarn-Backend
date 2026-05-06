import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reward, RewardStatus } from './reward.entity';
import { BlockchainService } from '../blockchain/blockchain.service';
import { UsersService } from '../users/users.service';

// Score thresholds → XLM reward amounts
const REWARD_TIERS = [
  { minScore: 100, amount: 10 },
  { minScore: 50,  amount: 5  },
  { minScore: 10,  amount: 1  },
];

@Injectable()
export class RewardsService {
  private readonly logger = new Logger(RewardsService.name);

  constructor(
    @InjectRepository(Reward) private readonly repo: Repository<Reward>,
    private readonly blockchainService: BlockchainService,
    private readonly usersService: UsersService,
  ) {}

  async evaluateReward(userId: string, score: number): Promise<void> {
    const tier = REWARD_TIERS.find((t) => score >= t.minScore);
    if (!tier) return;

    const user = await this.usersService.findById(userId);
    if (!user.stellarPublicKey) return;

    const reward = this.repo.create({
      user,
      amount: tier.amount,
      reason: `Score ${score} achieved`,
      status: RewardStatus.PENDING,
    });
    const saved = await this.repo.save(reward);

    try {
      const txHash = await this.blockchainService.distributeReward(
        user.stellarPublicKey,
        tier.amount,
      );
      await this.repo.update(saved.id, { status: RewardStatus.DISTRIBUTED, txHash });
    } catch (err) {
      this.logger.error(`Reward distribution failed for user ${userId}`, err);
      await this.repo.update(saved.id, { status: RewardStatus.FAILED });
    }
  }

  async getUserRewards(userId: string): Promise<Reward[]> {
    return this.repo.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }
}
