import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PreferencesService } from './preferences.service';
import { Theme, UserPreferences, Visibility } from './user-preferences.entity';

describe('PreferencesService', () => {
  let service: PreferencesService;
  let repo: Repository<UserPreferences>;

  const defaults = {
    id: 'prefs-1',
    userId: 'user-1',
    emailNotificationsEnabled: true,
    theme: Theme.SYSTEM,
    language: 'en',
    profileVisibility: Visibility.PUBLIC,
    activityVisibility: Visibility.PUBLIC,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreferencesService,
        {
          provide: getRepositoryToken(UserPreferences),
          useValue: {
            findOneBy: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PreferencesService>(PreferencesService);
    repo = module.get<Repository<UserPreferences>>(getRepositoryToken(UserPreferences));
  });

  describe('getOrCreate', () => {
    it('returns existing preferences without creating a new row', async () => {
      jest.spyOn(repo, 'findOneBy').mockResolvedValue(defaults as UserPreferences);

      const result = await service.getOrCreate('user-1');

      expect(repo.findOneBy).toHaveBeenCalledWith({ userId: 'user-1' });
      expect(repo.create).not.toHaveBeenCalled();
      expect(result).toBe(defaults);
    });

    it('creates default preferences when none exist', async () => {
      jest.spyOn(repo, 'findOneBy').mockResolvedValue(null);
      jest.spyOn(repo, 'create').mockReturnValue(defaults as UserPreferences);
      jest.spyOn(repo, 'save').mockResolvedValue(defaults as UserPreferences);

      const result = await service.getOrCreate('user-1');

      expect(repo.create).toHaveBeenCalledWith({ userId: 'user-1' });
      expect(repo.save).toHaveBeenCalledWith(defaults);
      expect(result).toBe(defaults);
    });
  });

  describe('update', () => {
    it('updates existing preferences and returns the fresh row', async () => {
      jest.spyOn(repo, 'findOneBy').mockResolvedValue(defaults as UserPreferences);
      jest.spyOn(repo, 'update').mockResolvedValue({ affected: 1 } as any);

      const updated = { ...defaults, theme: Theme.DARK };
      jest.spyOn(service, 'getOrCreate').mockResolvedValueOnce(defaults as UserPreferences)
        .mockResolvedValueOnce(updated as UserPreferences);

      const result = await service.update('user-1', { theme: Theme.DARK });

      expect(repo.update).toHaveBeenCalledWith('prefs-1', { theme: Theme.DARK });
      expect(result).toBe(updated);
    });
  });
});
