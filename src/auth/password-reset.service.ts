import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PasswordResetToken } from './password-reset-token.entity';
import { User } from '../users/user.entity';
import { EmailService } from './email.service';

@Injectable()
export class PasswordResetService {
  constructor(
    @InjectRepository(PasswordResetToken)
    private readonly tokenRepository: Repository<PasswordResetToken>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly emailService: EmailService,
  ) {}

  async createPasswordResetToken(email: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { email } });
    
    if (!user) {
      // Don't reveal if email exists or not for security reasons
      return;
    }

    // Clean up expired tokens for this user
    await this.cleanupExpiredTokens(user.id);

    // Check if user already has a valid token (rate limiting)
    const existingToken = await this.tokenRepository.findOne({
      where: {
        userId: user.id,
        used: false,
        expiresAt: MoreThan(new Date()), // Still valid (not expired)
      },
    });

    if (existingToken) {
      throw new BadRequestException('Password reset email already sent. Please check your email or wait before requesting again.');
    }

    // Generate token and save
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    const resetToken = this.tokenRepository.create({
      token,
      userId: user.id,
      expiresAt,
    });

    await this.tokenRepository.save(resetToken);

    // Send email
    try {
      await this.emailService.sendPasswordResetEmail(user.email, token);
    } catch (error) {
      // Clean up token if email fails
      await this.tokenRepository.delete(resetToken.id);
      throw error;
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const resetToken = await this.tokenRepository.findOne({
      where: { token, used: false },
      relations: ['user'],
    });

    if (!resetToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (resetToken.expiresAt < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update user password
    await this.userRepository.update(resetToken.userId, {
      passwordHash,
    });

    // Mark token as used
    resetToken.used = true;
    await this.tokenRepository.save(resetToken);

    // Clean up all tokens for this user
    await this.cleanupExpiredTokens(resetToken.userId);
  }

  private async cleanupExpiredTokens(userId?: string): Promise<void> {
    const where: any = {
      expiresAt: LessThan(new Date()),
    };

    if (userId) {
      where.userId = userId;
    }

    await this.tokenRepository.delete(where);
  }
}
