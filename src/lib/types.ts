export interface CountryLanguage {
  name: string;
}

export interface CountryCurrency {
  name: string;
  symbol?: string;
}

export interface CountryFlags {
  png?: string;
  svg?: string;
  alt?: string;
}

export interface CountryRaw {
  name: string;
  cca3: string;
  capital?: string;
  region?: string;
  subregion?: string;
  population?: number;
  area?: number;
  borders?: string[];
  flags?: CountryFlags;
  languages?: CountryLanguage[];
  currencies?: CountryCurrency[];
}

export interface Country {
  id: string;
  name: string;
  flagUrl: string;
  flagAlt: string;
  capital: string;
  region: string;
  population: number;
  populationFormatted: string;
  area: number;
  borders: string[];
  languages: string[];
  currency: string;
  description: string;
}
