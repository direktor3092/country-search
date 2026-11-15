import { debounce } from './debounce.js';
import { classifySearchError, type SearchErrorKind } from './classifyError.js';
import { mapCountryResponse } from './mapCountry.js';
import { searchCountries } from './searchCountries.js';
import type { Country } from './types.js';

export type SearchState =
  | { status: 'idle' }
  | { status: 'loading'; query: string }
  | { status: 'results'; query: string; countries: Country[] }
  | { status: 'empty'; query: string }
  | { status: 'error'; query: string; error: SearchErrorKind };

export interface SearchController {
  getState(): SearchState;
  setQuery(query: string): void;
  retry(): void;
  subscribe(listener: (state: SearchState) => void): () => void;
}

export interface SearchControllerOptions {
  search?: typeof searchCountries;
  debounceMs?: number;
  timeoutMs?: number;
}

export function createSearchController(options: SearchControllerOptions = {}): SearchController {
  const search = options.search ?? searchCountries;
  const debounceMs = options.debounceMs ?? 300;
  const timeoutMs = options.timeoutMs ?? 10000;

  let state: SearchState = { status: 'idle' };
  let lastQuery = '';
  let activeController: AbortController | null = null;
  const listeners = new Set<(state: SearchState) => void>();

  function setState(next: SearchState): void {
    state = next;
    listeners.forEach((listener) => listener(state));
  }

  function cancelActive(): void {
    if (activeController) {
      activeController.abort();
      activeController = null;
    }
  }

  async function runSearch(query: string): Promise<void> {
    const controller = new AbortController();
    activeController = controller;
    const combined = AbortSignal.any([controller.signal, AbortSignal.timeout(timeoutMs)]);

    try {
      const raw = await search(query, combined);

      if (controller.signal.aborted) {
        return;
      }

      if (raw.length === 0) {
        setState({ status: 'empty', query });
        return;
      }

      setState({ status: 'results', query, countries: raw.map(mapCountryResponse) });
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      const classified = classifySearchError(error);
      if (classified.kind === 'abort') {
        return;
      }
      setState({ status: 'error', query, error: classified });
    } finally {
      if (activeController === controller) {
        activeController = null;
      }
    }
  }

  const debouncedRun = debounce((query: string) => {
    void runSearch(query);
  }, debounceMs);

  function setQuery(query: string): void {
    const trimmed = query.trim();
    lastQuery = trimmed;

    cancelActive();

    if (trimmed === '') {
      debouncedRun.cancel();
      setState({ status: 'idle' });
      return;
    }

    setState({ status: 'loading', query: trimmed });
    debouncedRun(trimmed);
  }

  function retry(): void {
    if (lastQuery === '') {
      return;
    }
    cancelActive();
    setState({ status: 'loading', query: lastQuery });
    void runSearch(lastQuery);
  }

  function getState(): SearchState {
    return state;
  }

  function subscribe(listener: (state: SearchState) => void): () => void {
    listeners.add(listener);
    listener(state);
    return () => {
      listeners.delete(listener);
    };
  }

  return { getState, setQuery, retry, subscribe };
}
