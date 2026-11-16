import { debounce } from './debounce.js';
import { classifySearchError } from './classifyError.js';
import { mapCountryResponse } from './mapCountry.js';
import { searchCountries } from './searchCountries.js';
export function createSearchController(options = {}) {
    const search = options.search ?? searchCountries;
    const debounceMs = options.debounceMs ?? 300;
    const timeoutMs = options.timeoutMs ?? 10000;
    let state = { status: 'idle' };
    let lastQuery = '';
    let activeController = null;
    const listeners = new Set();
    function setState(next) {
        state = next;
        listeners.forEach((listener) => listener(state));
    }
    function cancelActive() {
        if (activeController) {
            activeController.abort();
            activeController = null;
        }
    }
    async function runSearch(query) {
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
        }
        catch (error) {
            if (controller.signal.aborted) {
                return;
            }
            const classified = classifySearchError(error);
            if (classified.kind === 'abort') {
                return;
            }
            setState({ status: 'error', query, error: classified });
        }
        finally {
            if (activeController === controller) {
                activeController = null;
            }
        }
    }
    const debouncedRun = debounce((query) => {
        void runSearch(query);
    }, debounceMs);
    function setQuery(query) {
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
    function retry() {
        if (lastQuery === '') {
            return;
        }
        cancelActive();
        setState({ status: 'loading', query: lastQuery });
        void runSearch(lastQuery);
    }
    function getState() {
        return state;
    }
    function subscribe(listener) {
        listeners.add(listener);
        listener(state);
        return () => {
            listeners.delete(listener);
        };
    }
    return { getState, setQuery, retry, subscribe };
}
