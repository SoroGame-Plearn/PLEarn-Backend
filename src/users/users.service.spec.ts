import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { EmailService } from '../common/email.service';

type MockRepo = Partial<Record<keyof Repository<User>, jest.Mock>>;

const baseUser = (overrides: Partial<User> = {}): User =>
  ({
    id: 'user-1',
    email: 'learner@example.com',
    username: 'learner',
    passwordHash: 'hashed',
    stellarPublicKey: null,
    totalScore: 0,
    bio: null,
    profilePictureUrl: null,
    profileCompletionScore: 0,
    profileCompletionAchievedAt: null,
    refreshToken: null,
    refreshTokenExpiresAt: null,
    isRefreshTokenRevoked: false,
    progress: [],
    rewards: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as User);

describe('UsersService', () => {
  let service: UsersService;
  let repo: MockRepo;
  let emailService: EmailService;
  let queryBuilder: any;

  beforeEach(async () => {
    queryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };

    repo = {
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repo },
        {
          provide: EmailService,
          useValue: {
            sendProfileCompletionEmail: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    emailService = module.get<EmailService>(EmailService);
  });

  describe('buildProfileCompletionItems / calculateProfileCompletionPercentage', () => {
    it('reports 0% when no checklist fields are set', () => {
      const items = service.buildProfileCompletionItems(baseUser());
      expect(items.every((item) => !item.completed)).toBe(true);
      expect(service.calculateProfileCompletionPercentage(items)).toBe(0);
    });

    it('reports partial completion when some fields are set', () => {
      const items = service.buildProfileCompletionItems(
        baseUser({ bio: 'Hello world' }),
      );
      const completed = items.filter((item) => item.completed);
      expect(completed).toHaveLength(1);
      expect(completed[0].key).toBe('bio');
      expect(service.calculateProfileCompletionPercentage(items)).toBe(33);
    });

    it('ignores blank/whitespace-only values', () => {
      const items = service.buildProfileCompletionItems(baseUser({ bio: '   ' }));
      expect(items.every((item) => !item.completed)).toBe(true);
    });

    it('reports 100% when every checklist field is set', () => {
      const items = service.buildProfileCompletionItems(
        baseUser({
          bio: 'Hello world',
          profilePictureUrl: 'https://example.com/avatar.png',
          stellarPublicKey: 'GABC123',
        }),
      );
      expect(service.calculateProfileCompletionPercentage(items)).toBe(100);
    });
  });

  describe('getProfileCompletion', () => {
    it('returns the checklist, percentage and achievement state for a user', async () => {
      queryBuilder.getOne.mockResolvedValue(
        baseUser({ bio: 'Hi', profilePictureUrl: 'https://example.com/a.png' }),
      );

      const result = await service.getProfileCompletion('user-1');

      expect(result.percentage).toBe(67);
      expect(result.isComplete).toBe(false);
      expect(result.achievedAt).toBeNull();
      expect(result.items).toHaveLength(3);
    });
  });

  describe('update', () => {
    it('persists the recalculated completion score without awarding a bonus when not yet complete', async () => {
      queryBuilder.getOne.mockResolvedValue(baseUser({ bio: 'Hi' }));
      (repo.update as jest.Mock).mockResolvedValue(undefined);

      await service.update('user-1', { bio: 'Hi' } as any);

      expect(repo.update).toHaveBeenCalledWith('user-1', { bio: 'Hi' });
      expect(repo.update).toHaveBeenCalledWith('user-1', { profileCompletionScore: 33 });
      expect(emailService.sendProfileCompletionEmail).not.toHaveBeenCalled();
    });

    it('awards the completion bonus and notifies the user the first time the profile reaches 100%', async () => {
      const completedUser = baseUser({
        bio: 'Hi',
        profilePictureUrl: 'https://example.com/a.png',
        stellarPublicKey: 'GABC123',
        totalScore: 10,
      });
      queryBuilder.getOne
        .mockResolvedValueOnce(completedUser)
        .mockResolvedValueOnce({ ...completedUser, profileCompletionScore: 100, totalScore: 60 });
      (repo.update as jest.Mock).mockResolvedValue(undefined);

      const result = await service.update('user-1', { stellarPublicKey: 'GABC123' } as any);

      expect(repo.update).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          profileCompletionScore: 100,
          totalScore: 60,
          profileCompletionAchievedAt: expect.any(Date),
        }),
      );
      expect(emailService.sendProfileCompletionEmail).toHaveBeenCalledWith(
        completedUser.email,
        completedUser.username,
      );
      expect(result.totalScore).toBe(60);
    });

    it('does not award a second bonus once the achievement was already recorded', async () => {
      const alreadyCompleted = baseUser({
        bio: 'Hi',
        profilePictureUrl: 'https://example.com/a.png',
        stellarPublicKey: 'GABC123',
        profileCompletionScore: 100,
        profileCompletionAchievedAt: new Date('2026-01-01'),
      });
      queryBuilder.getOne.mockResolvedValue(alreadyCompleted);
      (repo.update as jest.Mock).mockResolvedValue(undefined);

      await service.update('user-1', { bio: 'Hi' } as any);

      expect(repo.update).not.toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ profileCompletionAchievedAt: expect.anything() }),
      );
      expect(emailService.sendProfileCompletionEmail).not.toHaveBeenCalled();
    });
  });
});
