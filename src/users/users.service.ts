import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { CreateUserDto, ProfileCompletionDto, ProfileCompletionItem, UpdateUserDto } from './user.dto';
import { EmailService } from '../common/email.service';

// Fields that make up a "complete" profile, and the label shown for each in the checklist.
const PROFILE_COMPLETION_CHECKLIST: { key: keyof User; label: string }[] = [
  { key: 'bio', label: 'Add a short bio' },
  { key: 'profilePictureUrl', label: 'Upload a profile picture' },
  { key: 'stellarPublicKey', label: 'Link your Stellar wallet' },
];

// One-time bonus added to totalScore the first time a profile reaches 100% completion.
const PROFILE_COMPLETION_BONUS_SCORE = 50;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
    private readonly emailService: EmailService,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const exists = await this.repo.findOneBy({ email: dto.email });
    if (exists) throw new ConflictException('Email already registered');

    const user = this.repo.create({
      email: dto.email,
      username: dto.username,
      passwordHash: await bcrypt.hash(dto.password, 12),
      isRefreshTokenRevoked: false,
    });
    return this.repo.save(user);
  }

  async findById(id: string): Promise<User> {
    const user = await this.repo
      .createQueryBuilder('user')
      .addSelect('user.refreshToken')
      .addSelect('user.refreshTokenExpiresAt')
      .addSelect('user.isRefreshTokenRevoked')
      .where('user.id = :id', { id })
      .getOne();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    await this.repo.update(id, dto);
    return this.syncProfileCompletion(id);
  }

  async updateRefreshToken(
    userId: string,
    refreshToken: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.repo.update(userId, {
      refreshToken,
      refreshTokenExpiresAt: expiresAt,
      isRefreshTokenRevoked: false,
    });
  }

  async revokeRefreshToken(userId: string): Promise<void> {
    await this.repo.update(userId, {
      isRefreshTokenRevoked: true,
    });
  }

  async getProfileCompletion(userId: string): Promise<ProfileCompletionDto> {
    const user = await this.findById(userId);
    const items = this.buildProfileCompletionItems(user);
    const percentage = this.calculateProfileCompletionPercentage(items);

    return {
      percentage,
      isComplete: percentage === 100,
      items,
      achievedAt: user.profileCompletionAchievedAt ?? null,
    };
  }

  buildProfileCompletionItems(user: User): ProfileCompletionItem[] {
    return PROFILE_COMPLETION_CHECKLIST.map(({ key, label }) => ({
      key,
      label,
      completed: Boolean(user[key] && String(user[key]).trim().length > 0),
    }));
  }

  calculateProfileCompletionPercentage(items: ProfileCompletionItem[]): number {
    const completed = items.filter((item) => item.completed).length;
    return Math.round((completed / items.length) * 100);
  }

  // Recalculates the persisted completion score after any profile update, and,
  // the first time a profile reaches 100%, awards a one-off score bonus and
  // sends a notification email.
  private async syncProfileCompletion(userId: string): Promise<User> {
    const user = await this.findById(userId);
    const items = this.buildProfileCompletionItems(user);
    const percentage = this.calculateProfileCompletionPercentage(items);

    if (percentage === user.profileCompletionScore) {
      return user;
    }

    const justCompleted = percentage === 100 && !user.profileCompletionAchievedAt;
    const patch: Partial<
      Pick<User, 'profileCompletionScore' | 'profileCompletionAchievedAt' | 'totalScore'>
    > = { profileCompletionScore: percentage };

    if (justCompleted) {
      patch.profileCompletionAchievedAt = new Date();
      patch.totalScore = user.totalScore + PROFILE_COMPLETION_BONUS_SCORE;
    }

    await this.repo.update(userId, patch);
    const updated = await this.findById(userId);

    if (justCompleted) {
      try {
        await this.emailService.sendProfileCompletionEmail(updated.email, updated.username);
      } catch (err) {
        this.logger.error(`Failed to send profile completion email for user ${userId}`, err);
      }
    }

    return updated;
  }
}
