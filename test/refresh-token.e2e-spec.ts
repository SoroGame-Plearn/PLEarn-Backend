import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppModule } from '../src/app.module';
import { User } from '../src/users/user.entity';

describe('Refresh Token Mechanism (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;

  const testUser = {
    email: 'refreshtoken@test.com',
    username: 'refreshtokenuser',
    password: 'testPassword123',
  };

  let accessToken: string;
  let refreshToken: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    await app.init();

    // Clean up test user if exists
    await userRepository.delete({ email: testUser.email });
  });

  afterEach(async () => {
    // Clean up
    await userRepository.delete({ email: testUser.email });
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('should register a user and return access and refresh tokens', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(HttpStatus.CREATED);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('expiresIn');

      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Register user first
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser);
    });

    it('should login a user and return access and refresh tokens', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('expiresIn');

      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
    });

    it('should fail with invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('POST /auth/refresh', () => {
    beforeEach(async () => {
      // Register user and get tokens
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser);

      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
    });

    it('should refresh access token with valid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`)
        .send({ refreshToken })
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.accessToken).not.toEqual(accessToken);
    });

    it('should fail with invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', `Bearer invalid_token`)
        .send({ refreshToken: 'invalid_token' })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should fail without refresh token in body', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`)
        .send({})
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should fail without Authorization header', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should rotate refresh token on refresh', async () => {
      const response1 = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`)
        .send({ refreshToken });

      const newRefreshToken = response1.body.refreshToken;

      // Old refresh token should be invalidated
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`)
        .send({ refreshToken })
        .expect(HttpStatus.UNAUTHORIZED);

      // New refresh token should work
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${newRefreshToken}`)
        .send({ refreshToken: newRefreshToken })
        .expect(HttpStatus.OK);
    });
  });

  describe('POST /auth/logout', () => {
    beforeEach(async () => {
      // Register user and get tokens
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser);

      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
    });

    it('should logout user and revoke refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.message).toEqual('Logged out successfully');
    });

    it('should fail to refresh token after logout', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HttpStatus.OK);

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`)
        .send({ refreshToken })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should fail to logout without access token', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('Refresh Token Edge Cases', () => {
    it('should handle multiple refresh cycles', async () => {
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'multicycle@test.com',
          username: 'multicycleuser',
          password: 'testPassword123',
        });

      let currentRefreshToken = registerResponse.body.refreshToken;

      // Perform multiple refresh cycles
      for (let i = 0; i < 3; i++) {
        const response = await request(app.getHttpServer())
          .post('/auth/refresh')
          .set('Authorization', `Bearer ${currentRefreshToken}`)
          .send({ refreshToken: currentRefreshToken })
          .expect(HttpStatus.OK);

        expect(response.body).toHaveProperty('accessToken');
        expect(response.body).toHaveProperty('refreshToken');

        currentRefreshToken = response.body.refreshToken;
      }

      // Clean up
      await userRepository.delete({ email: 'multicycle@test.com' });
    });
  });
});

