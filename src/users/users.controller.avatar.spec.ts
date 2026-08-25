import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PreferencesService } from '../preferences/preferences.service';

describe('UsersController - avatar', () => {
  let controller: UsersController;
  let usersService: { uploadAvatar: jest.Mock; deleteAvatar: jest.Mock };

  const user = { id: 'user-1' };
  const file = {
    buffer: Buffer.from('bytes'),
    mimetype: 'image/jpeg',
    size: 1024,
  } as Express.Multer.File;

  beforeEach(async () => {
    usersService = { uploadAvatar: jest.fn(), deleteAvatar: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: usersService },
        { provide: PreferencesService, useValue: {} },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('delegates avatar upload to the service with the current user id', async () => {
    const updatedUser = { id: user.id, avatarUrl: 'https://cdn.example.com/avatars/user-1.jpg' };
    usersService.uploadAvatar.mockResolvedValue(updatedUser);

    const result = await controller.uploadAvatar(user, file);

    expect(usersService.uploadAvatar).toHaveBeenCalledWith(user.id, file);
    expect(result).toBe(updatedUser);
  });

  it('delegates avatar deletion to the service with the current user id', async () => {
    const updatedUser = { id: user.id, avatarUrl: null };
    usersService.deleteAvatar.mockResolvedValue(updatedUser);

    const result = await controller.deleteAvatar(user);

    expect(usersService.deleteAvatar).toHaveBeenCalledWith(user.id);
    expect(result).toBe(updatedUser);
  });
});
