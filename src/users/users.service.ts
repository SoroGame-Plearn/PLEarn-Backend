import { BadRequestException, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AvatarService } from './avatar.service';
import { StorageService } from '../storage/storage.service';
import { User } from './user.entity';
import { CreateUserDto, UpdateUserDto } from './user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
    private readonly avatarService: AvatarService,
    private readonly storageService: StorageService,
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
    return this.findById(id);
  }

  async uploadAvatar(userId: string, file?: Express.Multer.File): Promise<User> {
    if (!file) throw new BadRequestException('No file provided');

    const { buffer, contentType, extension } = await this.avatarService.process(
      file.buffer,
      file.mimetype,
    );

    const current = await this.findWithAvatarKey(userId);

    const key = `avatars/${userId}/${randomUUID()}.${extension}`;
    const { url } = await this.storageService.upload({ key, body: buffer, contentType });

    await this.repo.update(userId, { avatarUrl: url, avatarKey: key });

    if (current.avatarKey) {
      await this.storageService.delete(current.avatarKey);
    }

    return this.findById(userId);
  }

  async deleteAvatar(userId: string): Promise<User> {
    const current = await this.findWithAvatarKey(userId);
    if (!current.avatarKey) throw new NotFoundException('No profile picture to delete');

    await this.storageService.delete(current.avatarKey);
    await this.repo.update(userId, { avatarUrl: null, avatarKey: null });

    return this.findById(userId);
  }

  private async findWithAvatarKey(id: string): Promise<User> {
    const user = await this.repo
      .createQueryBuilder('user')
      .addSelect('user.avatarKey')
      .where('user.id = :id', { id })
      .getOne();
    if (!user) throw new NotFoundException('User not found');
    return user;
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
}

