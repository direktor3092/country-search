import { HttpError } from './searchCountries.js';
const TIMEOUT_MESSAGE = 'Request took too long. Please try again.';
const NETWORK_MESSAGE = 'Network error. Check your connection and try again.';
function hasName(error, name) {
    return (typeof error === 'object' &&
        error !== null &&
        'name' in error &&
        error.name === name);
}
export function isAbortError(error) {
    return hasName(error, 'AbortError');
}
export function isTimeoutError(error) {
    return hasName(error, 'TimeoutError');
}
export function isHttpError(error) {
    return error instanceof HttpError;
}
export function classifySearchError(error) {
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
