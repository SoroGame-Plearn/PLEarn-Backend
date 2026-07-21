import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PasswordResetService } from './password-reset.service';
import { PasswordResetToken } from './password-reset-token.entity';
import { User } from '../users/user.entity';
import { EmailService } from './email.service';

describe('PasswordResetService', () => {
  let service: PasswordResetService;
  let tokenRepository: Repository<PasswordResetToken>;
  let userRepository: Repository<User>;
  let emailService: EmailService;

  const mockUser = {
    id: 'user-id',
    email: 'test@example.com',
    username: 'testuser',
    passwordHash: 'old-hash',
  };

  const mockToken = {
    id: 'token-id',
    token: 'mock-token',
    userId: 'user-id',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
    used: false,
    user: mockUser,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordResetService,
        {
          provide: getRepositoryToken(PasswordResetToken),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendPasswordResetEmail: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PasswordResetService>(PasswordResetService);
    tokenRepository = module.get<Repository<PasswordResetToken>>(
      getRepositoryToken(PasswordResetToken),
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    emailService = module.get<EmailService>(EmailService);
  });

  describe('createPasswordResetToken', () => {
    it('should create a token and send email for existing user', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);
      jest.spyOn(tokenRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(tokenRepository, 'create').mockReturnValue(mockToken as PasswordResetToken);
      jest.spyOn(tokenRepository, 'save').mockResolvedValue(mockToken as PasswordResetToken);
      jest.spyOn(emailService, 'sendPasswordResetEmail').mockResolvedValue();

      await service.createPasswordResetToken('test@example.com');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(tokenRepository.create).toHaveBeenCalled();
      expect(tokenRepository.save).toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.any(String),
      );
    });

    it('should not throw error for non-existing user (security)', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.createPasswordResetToken('nonexistent@example.com'),
      ).resolves.not.toThrow();

      expect(tokenRepository.create).not.toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should throw error if user already has valid token', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);
      jest.spyOn(tokenRepository, 'findOne').mockResolvedValue(mockToken as PasswordResetToken);

      await expect(
        service.createPasswordResetToken('test@example.com'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should clean up token if email fails', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);
      jest.spyOn(tokenRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(tokenRepository, 'create').mockReturnValue(mockToken as PasswordResetToken);
      jest.spyOn(tokenRepository, 'save').mockResolvedValue(mockToken as PasswordResetToken);
      jest.spyOn(emailService, 'sendPasswordResetEmail').mockRejectedValue(new Error('Email failed'));
      jest.spyOn(tokenRepository, 'delete').mockResolvedValue({ affected: 1 } as any);

      await expect(
        service.createPasswordResetToken('test@example.com'),
      ).rejects.toThrow('Email failed');

      expect(tokenRepository.delete).toHaveBeenCalledWith('token-id');
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      jest.spyOn(tokenRepository, 'findOne').mockResolvedValue(mockToken as PasswordResetToken);
      jest.spyOn(userRepository, 'update').mockResolvedValue({ affected: 1 } as any);
      jest.spyOn(tokenRepository, 'save').mockResolvedValue({
        ...mockToken,
        used: true,
      } as PasswordResetToken);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('new-hash' as never);

      await service.resetPassword('mock-token', 'newPassword123');

      expect(tokenRepository.findOne).toHaveBeenCalledWith({
        where: { token: 'mock-token', used: false },
        relations: ['user'],
      });
      expect(userRepository.update).toHaveBeenCalledWith('user-id', {
        passwordHash: 'new-hash',
      });
      expect(tokenRepository.save).toHaveBeenCalledWith({
        ...mockToken,
        used: true,
      });
    });

    it('should throw error for invalid token', async () => {
      jest.spyOn(tokenRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.resetPassword('invalid-token', 'newPassword123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error for expired token', async () => {
      const expiredToken = {
        ...mockToken,
        expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      };

      jest.spyOn(tokenRepository, 'findOne').mockResolvedValue(expiredToken as PasswordResetToken);

      await expect(
        service.resetPassword('mock-token', 'newPassword123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error for already used token', async () => {
      const usedToken = {
        ...mockToken,
        used: true,
      };

      jest.spyOn(tokenRepository, 'findOne').mockResolvedValue(null); // Used tokens are filtered out by query

      await expect(
        service.resetPassword('mock-token', 'newPassword123'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
