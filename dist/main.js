import { createCachedSearch } from './lib/cache.js';
import { createHistory } from './lib/history.js';
import { createSearchController } from './lib/searchController.js';
import { mountApp } from './ui/app.js';
const cachedSearch = createCachedSearch({ timeoutMs: 10000 });
const controller = createSearchController({
    debounceMs: 300,
    timeoutMs: 10000,
    search: cachedSearch,
});
const history = createHistory();
mountApp(document.body, controller, history);
