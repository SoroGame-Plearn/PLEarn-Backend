import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Challenge } from './challenge.entity';

@Injectable()
export class ChallengesService {
  constructor(
    @InjectRepository(Challenge) private readonly repo: Repository<Challenge>,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async findAll(): Promise<Challenge[]> {
    const cacheKey = 'challenges:all';
    const cached = await this.cache.get<Challenge[]>(cacheKey);
    if (cached) return cached;

    const challenges = await this.repo.find({ where: { isActive: true } });
    await this.cache.set(cacheKey, challenges, 300); // 5 min
    return challenges;
  }

  async findOne(id: string): Promise<Challenge> {
    const challenge = await this.repo.findOneBy({ id });
    if (!challenge) throw new NotFoundException('Challenge not found');
    return challenge;
  }
}
