import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RecordProgressDto } from './progress.dto';
import { ActivityType } from './progress.entity';

describe('RecordProgressDto', () => {
  const valid = {
    challengeId: '4b9e6d0a-2f9c-4c4e-9d2b-0a2b3c4d5e6f',
    activityType: ActivityType.CHALLENGE_COMPLETED,
    score: 50,
  };

  it('accepts a fully valid payload', async () => {
    const dto = plainToInstance(RecordProgressDto, valid);
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects a non-UUID challengeId', async () => {
    const dto = plainToInstance(RecordProgressDto, { ...valid, challengeId: 'not-a-uuid' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'challengeId')).toBe(true);
  });

  it('rejects an invalid activityType', async () => {
    const dto = plainToInstance(RecordProgressDto, { ...valid, activityType: 'not_real' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'activityType')).toBe(true);
  });

  it('rejects a negative score', async () => {
    const dto = plainToInstance(RecordProgressDto, { ...valid, score: -1 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'score')).toBe(true);
  });

  it('rejects an extreme score value', async () => {
    const dto = plainToInstance(RecordProgressDto, { ...valid, score: Number.MAX_SAFE_INTEGER });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'score')).toBe(true);
  });

  it('rejects a non-integer score', async () => {
    const dto = plainToInstance(RecordProgressDto, { ...valid, score: 1.5 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'score')).toBe(true);
  });

  it('rejects metadata that is not an object', async () => {
    const dto = plainToInstance(RecordProgressDto, { ...valid, metadata: 'not-an-object' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'metadata')).toBe(true);
  });
});
