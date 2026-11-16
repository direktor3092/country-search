import { searchCountries } from './searchCountries.js';
import type { CountryRaw } from './types.js';

type SearchFn = (query: string, signal: AbortSignal) => Promise<CountryRaw[]>;

export interface CachedSearchOptions {
  search?: SearchFn;
  timeoutMs?: number;
}

function abortableRace<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) {
    return Promise.reject(signal.reason);
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => {
      reject(signal.reason);
    };
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort);
        reject(error);
      },
    );
  });
}

export function createCachedSearch(options: CachedSearchOptions = {}): SearchFn {
  const search = options.search ?? searchCountries;
  const timeoutMs = options.timeoutMs ?? 10000;
  const cache = new Map<string, CountryRaw[]>();
  const inFlight = new Map<string, Promise<CountryRaw[]>>();

  return function cachedSearch(query: string, signal: AbortSignal): Promise<CountryRaw[]> {
    const key = query.trim().toLowerCase();

    const cached = cache.get(key);
    if (cached) {
      return Promise.resolve(cached);
    }

    let shared = inFlight.get(key);
    if (!shared) {
      shared = search(query, AbortSignal.timeout(timeoutMs))
        .then((data) => {
          if (data.length > 0) {
            cache.set(key, data);
          }
          return data;
        })
        .finally(() => {
          inFlight.delete(key);
        });
      inFlight.set(key, shared);
    }

    return abortableRace(shared, signal);
  };
}
