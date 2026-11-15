import { describe, expect, it, vi } from 'vitest';
import { HttpError, searchCountries } from '../src/lib/searchCountries.js';
import type { CountryRaw } from '../src/lib/types.js';

const spainRaw: CountryRaw = {
  name: 'Spain',
  capital: 'Madrid',
  region: 'Europe',
  subregion: 'Southern Europe',
  population: 47351567,
  area: 505992,
  borders: ['FRA', 'PRT', 'AND'],
  cca3: 'ESP',
  flags: { png: 'https://flagcdn.com/w320/es.png', svg: 'https://flagcdn.com/es.svg' },
  languages: [{ name: 'Spanish' }],
  currencies: [{ name: 'Euro', symbol: '€' }],
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('HttpError', () => {
  it('extends Error and carries a status', () => {
    const error = new HttpError(500, 'Server error');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(HttpError);
    expect(error.status).toBe(500);
    expect(error.name).toBe('HttpError');
    expect(error.message).toBe('Server error');
  });
});

describe('searchCountries', () => {
  it('calls the API with the encoded query and the given signal', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse([spainRaw]));
    const controller = new AbortController();

    await searchCountries('united kingdom', controller.signal);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://countries.dev/name/united%20kingdom',
      expect.objectContaining({ signal: controller.signal }),
    );
  });

  it('returns the raw countries array on a successful response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse([spainRaw]));
    const controller = new AbortController();

    const result = await searchCountries('spain', controller.signal);

    expect(result).toEqual([spainRaw]);
  });

  it('returns an empty array on 404 without throwing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 404 }));
    const controller = new AbortController();

    const result = await searchCountries('zzzz', controller.signal);

    expect(result).toEqual([]);
  });

  it('throws HttpError with the response status on a server error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 500 }));
    const controller = new AbortController();

    await expect(searchCountries('spain', controller.signal)).rejects.toMatchObject({
      name: 'HttpError',
      status: 500,
    });
  });

  it('throws HttpError for a 400 response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 400 }));
    const controller = new AbortController();

    await expect(searchCountries('???', controller.signal)).rejects.toBeInstanceOf(HttpError);
  });

  it('propagates AbortError from fetch without wrapping it', async () => {
    const abortError = new DOMException('aborted', 'AbortError');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(abortError);
    const controller = new AbortController();

    await expect(searchCountries('spain', controller.signal)).rejects.toBe(abortError);
  });

  it('propagates network errors from fetch without wrapping them', async () => {
    const networkError = new TypeError('Failed to fetch');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(networkError);
    const controller = new AbortController();

    await expect(searchCountries('spain', controller.signal)).rejects.toBe(networkError);
  });
});
