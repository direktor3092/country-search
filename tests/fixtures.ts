import { vi } from 'vitest';
import type { CountryRaw } from '../src/lib/types.js';

export const spainRaw: CountryRaw = {
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

export const partialRaw: CountryRaw = {
  ...spainRaw,
  name: 'Partial',
  cca3: 'PRT',
};

export interface FetchMockOptions {
  resolvers: Map<string, (body: unknown) => void>;
  aborted: string[];
}

export function makeFetchMock(options: FetchMockOptions) {
  return vi.fn((url: string | URL | Request, init?: RequestInit) => {
    const query = decodeURIComponent(String(url).split('/name/')[1] ?? '');
    const signal = init?.signal;
    return new Promise<Response>((resolve, reject) => {
      signal?.addEventListener('abort', () => {
        options.aborted.push(query);
        reject(signal.reason);
      });
      options.resolvers.set(query, (body) => {
        resolve(
          new Response(JSON.stringify(body), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      });
    });
  });
}