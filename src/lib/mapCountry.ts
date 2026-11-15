import type { Country, CountryRaw } from './types.js';

const EM_DASH = '—';
const numberFormatter = new Intl.NumberFormat('en-US');

export function mapCountryResponse(raw: CountryRaw): Country {
  const flagUrl = raw.flags.png ?? raw.flags.svg ?? '';
  const capital = raw.capital || EM_DASH;
  const languages = raw.languages.map((language) => language.name);
  const currency = raw.currencies.map((entry) => entry.name).join(', ') || EM_DASH;
  const place = raw.subregion ? `${raw.subregion}, ${raw.region}` : raw.region;
  const description = `${raw.name} is a country in ${place}.`;
  const flagAlt = raw.flags.alt ?? `Flag of ${raw.name}`;

  return {
    id: raw.cca3,
    name: raw.name,
    flagUrl,
    flagAlt,
    capital,
    region: raw.region,
    population: raw.population,
    populationFormatted: numberFormatter.format(raw.population),
    area: raw.area,
    borders: raw.borders,
    languages,
    currency,
    description,
  };
}
