const STORAGE_KEY = 'country-search:history';
const MAX_ENTRIES = 5;
function read() {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw)
            return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed))
            return [];
        return parsed.filter((item) => typeof item === 'string');
    }
    catch {
        return [];
    }
}
export function createHistory() {
    return {
        get() {
            return read();
        },
        add(query) {
            const trimmed = query.trim();
            if (trimmed === '')
                return;
            const current = read();
            const next = [trimmed, ...current.filter((item) => item !== trimmed)].slice(0, MAX_ENTRIES);
            try {
                window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            }
            catch {
                // quota exceeded — history is non-critical
            }
        },
        clear() {
            try {
                window.localStorage.removeItem(STORAGE_KEY);
            }
            catch {
                // ignore
            }
        },
    };
}
