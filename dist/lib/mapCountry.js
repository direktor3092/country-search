const EM_DASH = '—';
const numberFormatter = new Intl.NumberFormat('en-US');
export function mapCountryResponse(raw) {
    const flags = raw.flags ?? {};
    const flagUrl = flags.png || flags.svg || '';
    const flagAlt = flags.alt ?? `Flag of ${raw.name}`;
    const capital = raw.capital || EM_DASH;
    const region = raw.region || 'Unknown';
    const languages = (raw.languages ?? []).map((language) => language.name);
    const currency = (raw.currencies ?? []).map((entry) => entry.name).join(', ') || EM_DASH;
    const borders = raw.borders ?? [];
    const population = raw.population ?? 0;
    const area = raw.area ?? 0;
    const description = raw.subregion
        ? `${raw.name} is a country in ${raw.subregion}, ${region}.`
        : raw.region
            ? `${raw.name} is a country in ${region}.`
            : `${raw.name} is a country.`;
    return {
        id: raw.cca3 || raw.name,
        name: raw.name,
        flagUrl,
        flagAlt,
        capital,
        region,
        population,
        populationFormatted: numberFormatter.format(population),
        area,
        borders,
        languages,
        currency,
        description,
    };
}
