import { createSearchController } from './lib/searchController.js';
import { mountApp } from './ui/app.js';

const controller = createSearchController({ debounceMs: 300, timeoutMs: 10000 });
mountApp(document.body, controller);
