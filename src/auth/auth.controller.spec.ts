import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordResetService } from './password-reset.service';
import { BadRequestException } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let passwordResetService: PasswordResetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
          },
        },
        {
          provide: PasswordResetService,
          useValue: {
            createPasswordResetToken: jest.fn(),
            resetPassword: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    passwordResetService = module.get<PasswordResetService>(PasswordResetService);
  });

  describe('forgotPassword', () => {
    it('should send password reset email', async () => {
      jest.spyOn(passwordResetService, 'createPasswordResetToken').mockResolvedValue();

      const result = await controller.forgotPassword({
        email: 'test@example.com',
      });

      expect(passwordResetService.createPasswordResetToken).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(result).toEqual({
        message: 'If an account with this email exists, a password reset link has been sent.',
      });
    });

    it('should handle rate limiting errors', async () => {
      jest
        .spyOn(passwordResetService, 'createPasswordResetToken')
        .mockRejectedValue(
          new BadRequestException('Password reset email already sent. Please check your email or wait before requesting again.')
        );

      await expect(
        controller.forgotPassword({ email: 'test@example.com' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      jest.spyOn(passwordResetService, 'resetPassword').mockResolvedValue();

      const result = await controller.resetPassword({
        token: 'valid-token',
        newPassword: 'newPassword123',
      });

      expect(passwordResetService.resetPassword).toHaveBeenCalledWith(
        'valid-token',
        'newPassword123',
      );
      expect(result).toEqual({
        message: 'Password has been successfully reset.',
      });
    });

    it('should handle invalid token errors', async () => {
      jest
        .spyOn(passwordResetService, 'resetPassword')
        .mockRejectedValue(new BadRequestException('Invalid or expired reset token'));

      await expect(
        controller.resetPassword({
          token: 'invalid-token',
          newPassword: 'newPassword123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle expired token errors', async () => {
      jest
        .spyOn(passwordResetService, 'resetPassword')
        .mockRejectedValue(new BadRequestException('Reset token has expired'));

      await expect(
        controller.resetPassword({
          token: 'expired-token',
          newPassword: 'newPassword123',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
