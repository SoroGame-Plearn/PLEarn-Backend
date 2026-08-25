import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPreferences } from './user-preferences.entity';
import { UpdateUserPreferencesDto } from './user-preferences.dto';

@Injectable()
export class PreferencesService {
  constructor(
    @InjectRepository(UserPreferences)
    private readonly repo: Repository<UserPreferences>,
  ) {}

  async getOrCreate(userId: string): Promise<UserPreferences> {
    const existing = await this.repo.findOneBy({ userId });
    if (existing) return existing;

    const created = this.repo.create({ userId });
    return this.repo.save(created);
  }

  async update(userId: string, dto: UpdateUserPreferencesDto): Promise<UserPreferences> {
    const preferences = await this.getOrCreate(userId);
    await this.repo.update(preferences.id, dto);
    return this.getOrCreate(userId);
  }
}
