# Country Search

Live search of countries by name with real request cancellation (AbortController),
debounce, 404-vs-error handling, timeout support, response cache and search history.

## Stack

- TypeScript (strict), ESM
- Vitest (fake timers, fetch mocks)
- ESLint 9 (flat config) + Prettier
- Husky: `pre-commit` → lint-staged, `pre-push` → `npm test`
- Vanilla DOM, no framework

## Scripts

| Script               | Purpose              |
| -------------------- | -------------------- |
| `npm run build`      | Compile TS → `dist/` |
| `npm run lint`       | Run ESLint           |
| `npm run format`     | Run Prettier         |
| `npm test`           | Run Vitest once      |
| `npm run test:watch` | Watch mode           |
