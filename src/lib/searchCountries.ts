import type { CountryRaw } from './types.js';

const API_BASE = 'https://countries.dev';

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message = `HTTP error ${status}`) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

export async function searchCountries(query: string, signal: AbortSignal): Promise<CountryRaw[]> {
  const url = `${API_BASE}/name/${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
  });

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    throw new HttpError(response.status);
  }

  return (await response.json()) as CountryRaw[];
}
