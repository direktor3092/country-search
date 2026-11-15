import { describe, expect, it, vi } from 'vitest';
import {
  classifySearchError,
  isAbortError,
  isHttpError,
  isTimeoutError,
} from '../src/lib/classifyError.js';
import { HttpError, searchCountries } from '../src/lib/searchCountries.js';

function abortError(): DOMException {
  return new DOMException('aborted', 'AbortError');
}

function timeoutError(): DOMException {
  return new DOMException('timed out', 'TimeoutError');
}

function mockFetchHonoringSignal(): void {
  vi.spyOn(globalThis, 'fetch').mockImplementation((_input, init) => {
    const signal = init?.signal;
    return new Promise<Response>((_resolve, reject) => {
      if (!signal) {
        return;
      }
      if (signal.aborted) {
        reject(signal.reason);
        return;
      }
      signal.addEventListener('abort', () => reject(signal.reason));
    });
  });
}

describe('isAbortError', () => {
  it('returns true for a DOMException named AbortError', () => {
    expect(isAbortError(abortError())).toBe(true);
  });

  it('returns false for a DOMException named TimeoutError', () => {
    expect(isAbortError(timeoutError())).toBe(false);
  });

  it('returns false for a plain Error', () => {
    expect(isAbortError(new Error('boom'))).toBe(false);
  });

  it('returns false for null, undefined and non-objects', () => {
    expect(isAbortError(null)).toBe(false);
    expect(isAbortError(undefined)).toBe(false);
    expect(isAbortError('AbortError')).toBe(false);
  });
});

describe('isTimeoutError', () => {
  it('returns true for a DOMException named TimeoutError', () => {
    expect(isTimeoutError(timeoutError())).toBe(true);
  });

  it('returns false for a DOMException named AbortError', () => {
    expect(isTimeoutError(abortError())).toBe(false);
  });

  it('returns false for an HttpError', () => {
    expect(isTimeoutError(new HttpError(500))).toBe(false);
  });

  it('returns false for null and primitives', () => {
    expect(isTimeoutError(null)).toBe(false);
    expect(isTimeoutError(42)).toBe(false);
  });
});

describe('isHttpError', () => {
  it('returns true for an HttpError instance', () => {
    expect(isHttpError(new HttpError(500))).toBe(true);
  });

  it('returns false for a plain Error', () => {
    expect(isHttpError(new Error('boom'))).toBe(false);
  });
});

describe('classifySearchError', () => {
  it('classifies AbortError as abort', () => {
    expect(classifySearchError(abortError())).toEqual({ kind: 'abort' });
  });

  it('classifies TimeoutError as timeout', () => {
    const result = classifySearchError(timeoutError());
    expect(result.kind).toBe('timeout');
  });

  it('classifies HttpError as http with the status', () => {
    const result = classifySearchError(new HttpError(503));
    expect(result).toEqual({ kind: 'http', status: 503, message: expect.any(String) });
  });

  it('classifies TypeError as network and unknown errors as unknown', () => {
    expect(classifySearchError(new TypeError('Failed to fetch')).kind).toBe('network');
    expect(classifySearchError(new Error('???')).kind).toBe('unknown');
    expect(classifySearchError('not an error').kind).toBe('unknown');
  });
});

describe('integration with real abort signals', () => {
  it('recognizes AbortController.abort() as an abort error', async () => {
    mockFetchHonoringSignal();
    const controller = new AbortController();
    const promise = searchCountries('spain', controller.signal);

    controller.abort();

    await expect(promise).rejects.toSatisfy((error: unknown) => isAbortError(error));
  });

  it('recognizes AbortSignal.timeout(0) as a timeout error', async () => {
    mockFetchHonoringSignal();
    const signal = AbortSignal.timeout(0);
    const promise = searchCountries('spain', signal);

    await expect(promise).rejects.toSatisfy((error: unknown) => isTimeoutError(error));
  });
});
