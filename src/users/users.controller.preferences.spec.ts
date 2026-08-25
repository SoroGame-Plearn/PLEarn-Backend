import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PreferencesService } from '../preferences/preferences.service';
import { Theme } from '../preferences/user-preferences.entity';

describe('UsersController - preferences', () => {
  let controller: UsersController;
  let preferencesService: { getOrCreate: jest.Mock; update: jest.Mock };

  const user = { id: 'user-1' };

  beforeEach(async () => {
    preferencesService = { getOrCreate: jest.fn(), update: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: {} },
        { provide: PreferencesService, useValue: preferencesService },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('fetches (and lazily creates) the current user preferences', async () => {
    const preferences = { userId: user.id, theme: Theme.SYSTEM };
    preferencesService.getOrCreate.mockResolvedValue(preferences);

    const result = await controller.getMyPreferences(user);

    expect(preferencesService.getOrCreate).toHaveBeenCalledWith(user.id);
    expect(result).toBe(preferences);
  });

  it('delegates preference updates to the service with the current user id', async () => {
    const updated = { userId: user.id, theme: Theme.DARK };
    preferencesService.update.mockResolvedValue(updated);

    const dto = { theme: Theme.DARK };
    const result = await controller.updateMyPreferences(user, dto as any);

    expect(preferencesService.update).toHaveBeenCalledWith(user.id, dto);
    expect(result).toBe(updated);
  });
});
