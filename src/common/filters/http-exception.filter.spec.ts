import { ArgumentsHost, BadRequestException, NotFoundException } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

function createHost(url: string) {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ url, method: 'POST' }),
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();

  it('flattens validation error arrays into an errors list', () => {
    const { host, status, json } = createHost('/api/v1/users/me');
    const exception = new BadRequestException({
      message: ['email must be a valid email address', 'username is too short'],
      error: 'Validation Failed',
    });

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(400);
    const body = json.mock.calls[0][0];
    expect(body.statusCode).toBe(400);
    expect(body.path).toBe('/api/v1/users/me');
    expect(body.message).toBe('Validation failed');
    expect(body.errors).toEqual([
      'email must be a valid email address',
      'username is too short',
    ]);
    expect(typeof body.timestamp).toBe('string');
  });

  it('passes through a plain string message for non-validation errors', () => {
    const { host, status, json } = createHost('/api/v1/users/123');
    const exception = new NotFoundException('User not found');

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(404);
    const body = json.mock.calls[0][0];
    expect(body.message).toBe('User not found');
    expect(body.errors).toBeUndefined();
  });
});
