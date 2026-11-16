const STORAGE_KEY = 'country-search:history';
const MAX_ENTRIES = 5;

export interface SearchHistory {
  get(): string[];
  add(query: string): void;
  clear(): void;
}

function read(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

export function createHistory(): SearchHistory {
  return {
    get() {
      return read();
    },
    add(query: string) {
      const trimmed = query.trim();
      if (trimmed === '') return;
      const current = read();
      const next = [trimmed, ...current.filter((item) => item !== trimmed)].slice(0, MAX_ENTRIES);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // quota exceeded — history is non-critical
      }
    },
    clear() {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    },
  };
}
