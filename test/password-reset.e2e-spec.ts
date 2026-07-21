import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppModule } from '../src/app.module';
import { User } from '../src/users/user.entity';
import { PasswordResetToken } from '../src/auth/password-reset-token.entity';
import * as bcrypt from 'bcrypt';

describe('Password Reset (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let tokenRepository: Repository<PasswordResetToken>;

  const testUser = {
    email: 'test@example.com',
    username: 'testuser',
    password: 'oldPassword123',
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    tokenRepository = moduleFixture.get<Repository<PasswordResetToken>>(
      getRepositoryToken(PasswordResetToken),
    );

    await app.init();

    // Create test user
    const passwordHash = await bcrypt.hash(testUser.password, 12);
    await userRepository.save({
      email: testUser.email,
      username: testUser.username,
      passwordHash,
    });
  });

  afterEach(async () => {
    // Clean up
    await tokenRepository.delete({});
    await userRepository.delete({});
    await app.close();
  });

  describe('/auth/forgot-password (POST)', () => {
    it('should return success message for existing email', () => {
      return request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200)
        .expect({
          message: 'If an account with this email exists, a password reset link has been sent.',
        });
    });

    it('should return success message for non-existing email (security)', () => {
      return request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200)
        .expect({
          message: 'If an account with this email exists, a password reset link has been sent.',
        });
    });

    it('should validate email format', () => {
      return request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'invalid-email' })
        .expect(400);
    });

    it('should apply rate limiting', async () => {
      // First request should succeed
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

      // Second immediate request should be rate limited
      return request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(400);
    });
  });

  describe('/auth/reset-password (POST)', () => {
    let resetToken: string;

    beforeEach(async () => {
      // Create a password reset token
      const user = await userRepository.findOne({ where: { email: testUser.email } });
      if (!user) throw new Error('Test user not found');
      
      resetToken = 'test-token-' + Date.now();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      await tokenRepository.save({
        token: resetToken,
        userId: user.id,
        expiresAt,
        used: false,
      });
    });

    it('should reset password with valid token', async () => {
      const newPassword = 'newPassword123';

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          newPassword,
        })
        .expect(200)
        .expect({
          message: 'Password has been successfully reset.',
        });

      // Verify password was changed
      const user = await userRepository.findOne({
        where: { email: testUser.email },
        select: ['id', 'email', 'passwordHash'],
      });
      
      if (!user) throw new Error('User not found after password reset');

      const isValidPassword = await bcrypt.compare(newPassword, user.passwordHash);
      expect(isValidPassword).toBe(true);

      // Verify token was marked as used
      const token = await tokenRepository.findOne({
        where: { token: resetToken },
      });
      if (!token) throw new Error('Token not found after reset');
      expect(token.used).toBe(true);
    });

    it('should reject invalid token', () => {
      return request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: 'invalid-token',
          newPassword: 'newPassword123',
        })
        .expect(400);
    });

    it('should reject expired token', async () => {
      // Create expired token
      const user = await userRepository.findOne({ where: { email: testUser.email } });
      if (!user) throw new Error('Test user not found');
      
      const expiredToken = 'expired-token-' + Date.now();
      const expiredAt = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

      await tokenRepository.save({
        token: expiredToken,
        userId: user.id,
        expiresAt: expiredAt,
        used: false,
      });

      return request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: expiredToken,
          newPassword: 'newPassword123',
        })
        .expect(400);
    });

    it('should reject used token', async () => {
      // Mark token as used
      await tokenRepository.update({ token: resetToken }, { used: true });

      return request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'newPassword123',
        })
        .expect(400);
    });

    it('should validate password requirements', () => {
      return request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'short', // Too short
        })
        .expect(400);
    });

    it('should allow user to login with new password after reset', async () => {
      const newPassword = 'newPassword123';

      // Reset password
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          newPassword,
        })
        .expect(200);

      // Login with new password
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: newPassword,
        })
        .expect(201)
        .expect((res: any) => {
          expect(res.body).toHaveProperty('accessToken');
        });
    });
  });
});
