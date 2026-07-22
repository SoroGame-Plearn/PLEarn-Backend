import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/user.dto';
import { User } from '../users/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: CreateUserDto) {
    const user = await this.usersService.create(dto);
    return this.generateTokens(user);
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.generateTokens(user);
  }

  async refreshAccessToken(userId: string, refreshToken: string) {
    const user = await this.usersService.findById(userId);

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if refresh token is revoked
    if (user.isRefreshTokenRevoked) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    // Check if refresh token has expired
    if (user.refreshTokenExpiresAt && new Date() > user.refreshTokenExpiresAt) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    // Verify the refresh token matches
    if (user.refreshToken !== refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Generate new tokens with refresh token rotation
    return this.generateTokens(user);
  }

  async logout(userId: string) {
    await this.usersService.revokeRefreshToken(userId);
  }

  private async generateTokens(user: User) {
    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, type: 'access' },
      {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: this.configService.get<string>('jwt.expiresIn'),
      },
    );

    // Generate refresh token
    const refreshTokenValue = this.generateRandomToken();
    const refreshTokenExpiresAt = this.calculateRefreshTokenExpiration();

    // Save refresh token to user
    await this.usersService.updateRefreshToken(
      user.id,
      refreshTokenValue,
      refreshTokenExpiresAt,
    );

    const refreshToken = this.jwtService.sign(
      { sub: user.id, email: user.email, type: 'refresh' },
      {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<string>('jwt.refreshExpiresIn'),
      },
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.configService.get<string>('jwt.expiresIn'),
    };
  }

  private generateRandomToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private calculateRefreshTokenExpiration(): Date {
    const refreshExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn') || '30d';
    const expirationMs = this.parseExpiration(refreshExpiresIn);
    return new Date(Date.now() + expirationMs);
  }

  private parseExpiration(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) throw new Error('Invalid expiration format');

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        throw new Error('Invalid expiration unit');
    }
  }
}
