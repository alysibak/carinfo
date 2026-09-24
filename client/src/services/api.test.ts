import { describe, expect, it } from 'vitest';
import { apiErrorMessage } from './api';
import { HttpError } from './http';

describe('apiErrorMessage', () => {
  it('surfaces what the server said', () => {
    const error = new HttpError('x', 400, { success: false, error: 'Not a valid VIN.' });
    expect(apiErrorMessage(error)).toBe('Not a valid VIN.');
  });

  it('is null when there is nothing actionable to show', () => {
    expect(apiErrorMessage(new HttpError('Network request failed', 0))).toBeNull();
    expect(apiErrorMessage(new HttpError('x', 502, '<html>Bad gateway</html>'))).toBeNull();
    expect(apiErrorMessage(new HttpError('x', 500, { success: false, error: '  ' }))).toBeNull();
    expect(apiErrorMessage(new Error('boom'))).toBeNull();
  });
});
