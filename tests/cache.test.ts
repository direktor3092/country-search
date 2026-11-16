import { describe, expect, it, vi } from 'vitest';
import { createCachedSearch } from '../src/lib/cache.js';
import type { CountryRaw } from '../src/lib/types.js';
import { searchCountries } from '../src/lib/searchCountries.js';

const spainRaw: CountryRaw = {
  name: 'Spain',
  cca3: 'ESP',
  capital: 'Madrid',
  region: 'Europe',
  population: 47351567,
  area: 505992,
  borders: [],
  flags: { png: 'https://flagcdn.com/w320/es.png' },
  languages: [{ name: 'Spanish' }],
  currencies: [{ name: 'Euro' }],
};

describe('createCachedSearch', () => {
  it('calls the underlying search on the first request', async () => {
    const search = vi.fn().mockResolvedValue([spainRaw]);
    const cachedSearch = createCachedSearch({ search, timeoutMs: 10000 });

    const result = await cachedSearch('spain', new AbortController().signal);

    expect(search).toHaveBeenCalledTimes(1);
    expect(result).toEqual([spainRaw]);
  });

  it('serves the second identical request from the cache', async () => {
    const search = vi.fn().mockResolvedValue([spainRaw]);
    const cachedSearch = createCachedSearch({ search, timeoutMs: 10000 });

    await cachedSearch('spain', new AbortController().signal);
    const result = await cachedSearch('spain', new AbortController().signal);

    expect(search).toHaveBeenCalledTimes(1);
    expect(result).toEqual([spainRaw]);
  });

  it('treats queries case-insensitively when checking the cache', async () => {
    const search = vi.fn().mockResolvedValue([spainRaw]);
    const cachedSearch = createCachedSearch({ search, timeoutMs: 10000 });

    await cachedSearch('Spain', new AbortController().signal);
    await cachedSearch('spain', new AbortController().signal);

    expect(search).toHaveBeenCalledTimes(1);
  });

  it('deduplicates concurrent identical requests into one network call', async () => {
    let resolveFetch: ((body: CountryRaw[]) => void) | null = null;
    const search = vi.fn(
      () =>
        new Promise<CountryRaw[]>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const cachedSearch = createCachedSearch({ search, timeoutMs: 10000 });

    const first = cachedSearch('spain', new AbortController().signal);
    const second = cachedSearch('spain', new AbortController().signal);

    resolveFetch?.([spainRaw]);

    const [firstResult, secondResult] = await Promise.all([first, second]);
    expect(search).toHaveBeenCalledTimes(1);
    expect(firstResult).toEqual([spainRaw]);
    expect(secondResult).toEqual([spainRaw]);
  });

  it('cancelling one caller does not break the shared request for others', async () => {
    let resolveFetch: ((body: CountryRaw[]) => void) | null = null;
    const search = vi.fn(
      () =>
        new Promise<CountryRaw[]>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const cachedSearch = createCachedSearch({ search, timeoutMs: 10000 });

    const controllerA = new AbortController();
    const controllerB = new AbortController();
    const a = cachedSearch('spain', controllerA.signal);
    const b = cachedSearch('spain', controllerB.signal);

    controllerA.abort();

    await expect(a).rejects.toMatchObject({ name: 'AbortError' });

    resolveFetch?.([spainRaw]);
    await expect(b).resolves.toEqual([spainRaw]);
  });

  it('does not cache an empty result', async () => {
    const search = vi.fn().mockResolvedValue([]);
    const cachedSearch = createCachedSearch({ search, timeoutMs: 10000 });

    await cachedSearch('zzzz', new AbortController().signal);
    await cachedSearch('zzzz', new AbortController().signal);

    expect(search).toHaveBeenCalledTimes(2);
  });

  it('clears the in-flight promise on failure so the next call retries', async () => {
    const error = new Error('network down');
    const search = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce([spainRaw]);
    const cachedSearch = createCachedSearch({ search, timeoutMs: 10000 });

    await expect(cachedSearch('spain', new AbortController().signal)).rejects.toBe(error);
    await expect(cachedSearch('spain', new AbortController().signal)).resolves.toEqual([spainRaw]);

    expect(search).toHaveBeenCalledTimes(2);
  });
  it('aborts the underlying fetch when all callers detach', async () => {
    const fetchSpy = vi.fn((_url: string | URL | Request, init?: RequestInit) => {
      const signal = init?.signal;
      return new Promise<Response>((_resolve, reject) => {
        if (!signal) return;
        if (signal.aborted) {
          reject(signal.reason);
          return;
        }
        signal.addEventListener('abort', () => reject(signal.reason));
      });
    });
    vi.stubGlobal('fetch', fetchSpy);

    const search = (q: string, s: AbortSignal) => searchCountries(q, s);
    const cachedSearch = createCachedSearch({ search, timeoutMs: 10000 });

    const controllerA = new AbortController();
    const controllerB = new AbortController();
    const a = cachedSearch('spain', controllerA.signal);
    const b = cachedSearch('spain', controllerB.signal);

    const fetchSignal = fetchSpy.mock.calls[0]?.[1]?.signal;
    expect(fetchSignal).toBeDefined();
    expect(fetchSignal?.aborted).toBe(false);

    controllerA.abort();
    await expect(a).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchSignal?.aborted).toBe(false);

    controllerB.abort();
    await expect(b).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchSignal?.aborted).toBe(true);
  });
});
