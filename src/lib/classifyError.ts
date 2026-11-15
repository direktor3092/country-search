import { HttpError } from './searchCountries.js';

export type SearchErrorKind =
  | { kind: 'abort' }
  | { kind: 'timeout'; message: string }
  | { kind: 'http'; status: number; message: string }
  | { kind: 'network'; message: string }
  | { kind: 'unknown'; message: string };

const TIMEOUT_MESSAGE = 'Request took too long. Please try again.';
const NETWORK_MESSAGE = 'Network error. Check your connection and try again.';

function hasName(error: unknown, name: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name: unknown }).name === name
  );
}

export function isAbortError(error: unknown): boolean {
  return hasName(error, 'AbortError');
}

export function isTimeoutError(error: unknown): boolean {
  return hasName(error, 'TimeoutError');
}

export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError;
}

export function classifySearchError(error: unknown): SearchErrorKind {
  if (isAbortError(error)) {
    return { kind: 'abort' };
  }
  if (isTimeoutError(error)) {
    return { kind: 'timeout', message: TIMEOUT_MESSAGE };
  }
  if (isHttpError(error)) {
    return {
      kind: 'http',
      status: error.status,
      message: `Server error (${error.status}). Please try again.`,
    };
  }
  if (error instanceof TypeError) {
    return { kind: 'network', message: NETWORK_MESSAGE };
  }
  const message = error instanceof Error ? error.message : 'Something went wrong.';
  return { kind: 'unknown', message };
}
