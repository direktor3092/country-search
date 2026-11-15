import { describe, expect, it } from 'vitest';
import { mapCountryResponse } from '../src/lib/mapCountry.js';
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

describe('mapCountryResponse', () => {
  it('maps the core card fields', () => {
    const country = mapCountryResponse(spainRaw);
    expect(country.id).toBe('ESP');
    expect(country.name).toBe('Spain');
    expect(country.capital).toBe('Madrid');
    expect(country.region).toBe('Europe');
    expect(country.population).toBe(47351567);
  });

  it('formats population with thousands separators', () => {
    const country = mapCountryResponse(spainRaw);
    expect(country.populationFormatted).toBe('47,351,567');
  });

  it('uses the png flag and falls back to svg', () => {
    const withPng = mapCountryResponse(spainRaw);
    expect(withPng.flagUrl).toBe('https://flagcdn.com/w320/es.png');

    const svgOnly = mapCountryResponse({
      ...spainRaw,
      flags: { svg: 'https://flagcdn.com/es.svg' },
    });
    expect(svgOnly.flagUrl).toBe('https://flagcdn.com/es.svg');
  });

  it('uses an em dash when the capital is missing', () => {
    const country = mapCountryResponse({ ...spainRaw, capital: '' });
    expect(country.capital).toBe('—');
  });

  it('collects language names into a flat array', () => {
    const country = mapCountryResponse({
      ...spainRaw,
      languages: [{ name: 'Spanish' }, { name: 'Catalan' }],
    });
    expect(country.languages).toEqual(['Spanish', 'Catalan']);
  });

  it('joins currency names into a single string', () => {
    const country = mapCountryResponse({
      ...spainRaw,
      currencies: [{ name: 'Euro', symbol: '€' }, { name: 'Peseta' }],
    });
    expect(country.currency).toBe('Euro, Peseta');
  });

  it('keeps area and borders for the detail view', () => {
    const country = mapCountryResponse(spainRaw);
    expect(country.area).toBe(505992);
    expect(country.borders).toEqual(['FRA', 'PRT', 'AND']);
  });

  it('builds a human readable description from region and name', () => {
    const country = mapCountryResponse(spainRaw);
    expect(country.description).toContain('Spain');
    expect(country.description).toContain('Southern Europe');
  });

  it('handles empty borders, currencies and languages', () => {
    const country = mapCountryResponse({
      ...spainRaw,
      borders: [],
      currencies: [],
      languages: [],
    });
    expect(country.borders).toEqual([]);
    expect(country.currency).toBe('—');
    expect(country.languages).toEqual([]);
  });
});
