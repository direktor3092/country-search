import { searchCountries } from './searchCountries.js';
export function createCachedSearch(options = {}) {
    const search = options.search ?? searchCountries;
    const timeoutMs = options.timeoutMs ?? 10000;
    const cache = new Map();
    const inFlight = new Map();
    return function cachedSearch(query, signal) {
        const key = query.trim().toLowerCase();
        const cached = cache.get(key);
        if (cached) {
            return Promise.resolve(cached);
        }
        if (signal.aborted) {
            return Promise.reject(signal.reason);
        }
        let entry = inFlight.get(key);
        if (entry && entry.controller.signal.aborted) {
            inFlight.delete(key);
            entry = undefined;
        }
        if (!entry) {
            const controller = new AbortController();
            const combined = AbortSignal.any([controller.signal, AbortSignal.timeout(timeoutMs)]);
            const newEntry = { promise: Promise.resolve([]), refs: 0, controller };
            newEntry.promise = search(query, combined)
                .then((data) => {
                if (data.length > 0)
                    cache.set(key, data);
                return data;
            })
                .finally(() => {
                if (inFlight.get(key) === newEntry) {
                    inFlight.delete(key);
                }
            });
            inFlight.set(key, newEntry);
            entry = newEntry;
        }
        const current = entry;
        current.refs += 1;
        return new Promise((resolve, reject) => {
            const detach = () => {
                current.refs -= 1;
                if (current.refs <= 0 && !current.controller.signal.aborted) {
                    current.controller.abort();
                    inFlight.delete(key);
                }
            };
            const onAbort = () => {
                detach();
                reject(signal.reason);
            };
            signal.addEventListener('abort', onAbort, { once: true });
            current.promise.then((value) => {
                signal.removeEventListener('abort', onAbort);
                resolve(value);
            }, (error) => {
                signal.removeEventListener('abort', onAbort);
                reject(error);
            });
        });
    };
}
