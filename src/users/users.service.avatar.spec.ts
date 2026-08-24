import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { AvatarService } from './avatar.service';
import { StorageService } from '../storage/storage.service';
import { User } from './user.entity';

describe('UsersService - avatar', () => {
  let service: UsersService;
  let avatarService: { process: jest.Mock };
  let storageService: { upload: jest.Mock; delete: jest.Mock };
  let queryBuilder: { addSelect: jest.Mock; where: jest.Mock; getOne: jest.Mock };
  let repo: { update: jest.Mock; createQueryBuilder: jest.Mock };

  const userId = 'user-1';
  const file = { buffer: Buffer.from('raw-bytes'), mimetype: 'image/jpeg' } as Express.Multer.File;

  beforeEach(async () => {
    queryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };

    repo = {
      update: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    avatarService = { process: jest.fn() };
    storageService = { upload: jest.fn(), delete: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repo },
        { provide: AvatarService, useValue: avatarService },
        { provide: StorageService, useValue: storageService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('uploadAvatar', () => {
    it('throws when no file is provided', async () => {
      await expect(service.uploadAvatar(userId, undefined)).rejects.toThrow(BadRequestException);
      expect(repo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('processes, uploads, persists the new avatar and deletes the previous one', async () => {
      avatarService.process.mockResolvedValue({
        buffer: Buffer.from('optimized-bytes'),
        contentType: 'image/jpeg',
        extension: 'jpg',
      });
      storageService.upload.mockResolvedValue({
        key: 'ignored-provider-echo',
        url: 'https://cdn.example.com/avatars/user-1/new.jpg',
      });
      queryBuilder.getOne
        .mockResolvedValueOnce({ id: userId, avatarKey: 'avatars/user-1/old.jpg' }) // findWithAvatarKey
        .mockResolvedValueOnce({ id: userId, avatarUrl: 'https://cdn.example.com/avatars/user-1/new.jpg' }); // findById

      const result = await service.uploadAvatar(userId, file);

      expect(avatarService.process).toHaveBeenCalledWith(file.buffer, file.mimetype);
      expect(storageService.upload).toHaveBeenCalledWith(
        expect.objectContaining({
          key: expect.stringMatching(new RegExp(`^avatars/${userId}/[0-9a-f-]+\\.jpg$`)),
          body: Buffer.from('optimized-bytes'),
          contentType: 'image/jpeg',
        }),
      );
      expect(repo.update).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          avatarUrl: 'https://cdn.example.com/avatars/user-1/new.jpg',
          avatarKey: expect.stringMatching(new RegExp(`^avatars/${userId}/[0-9a-f-]+\\.jpg$`)),
        }),
      );
      expect(storageService.delete).toHaveBeenCalledWith('avatars/user-1/old.jpg');
      expect(result).toEqual({ id: userId, avatarUrl: 'https://cdn.example.com/avatars/user-1/new.jpg' });
    });

    it('does not attempt to delete anything when there was no previous avatar', async () => {
      avatarService.process.mockResolvedValue({
        buffer: Buffer.from('optimized-bytes'),
        contentType: 'image/jpeg',
        extension: 'jpg',
      });
      storageService.upload.mockResolvedValue({ key: 'k', url: 'https://cdn.example.com/new.jpg' });
      queryBuilder.getOne
        .mockResolvedValueOnce({ id: userId, avatarKey: null })
        .mockResolvedValueOnce({ id: userId, avatarUrl: 'https://cdn.example.com/new.jpg' });

      await service.uploadAvatar(userId, file);

      expect(storageService.delete).not.toHaveBeenCalled();
    });

    it('propagates image validation errors without touching storage', async () => {
      avatarService.process.mockRejectedValue(
        new BadRequestException('Only JPEG and PNG images are supported'),
      );

      await expect(service.uploadAvatar(userId, file)).rejects.toThrow(BadRequestException);
      expect(storageService.upload).not.toHaveBeenCalled();
      expect(repo.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteAvatar', () => {
    it('deletes the stored file and clears the avatar columns', async () => {
      queryBuilder.getOne
        .mockResolvedValueOnce({ id: userId, avatarKey: 'avatars/user-1/old.jpg' })
        .mockResolvedValueOnce({ id: userId, avatarUrl: null });

      const result = await service.deleteAvatar(userId);

      expect(storageService.delete).toHaveBeenCalledWith('avatars/user-1/old.jpg');
      expect(repo.update).toHaveBeenCalledWith(userId, { avatarUrl: null, avatarKey: null });
      expect(result).toEqual({ id: userId, avatarUrl: null });
    });

    it('throws NotFoundException when the user has no avatar to delete', async () => {
      queryBuilder.getOne.mockResolvedValueOnce({ id: userId, avatarKey: null });

      await expect(service.deleteAvatar(userId)).rejects.toThrow(NotFoundException);
      expect(storageService.delete).not.toHaveBeenCalled();
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the user does not exist', async () => {
      queryBuilder.getOne.mockResolvedValueOnce(undefined);

      await expect(service.deleteAvatar('missing')).rejects.toThrow(NotFoundException);
    });
  });
});
