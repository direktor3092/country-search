# Design

## Cancellation of stale requests

The race we fight: user types `sp`, server responds slowly; user types `spain`, server responds fast; then the response for `sp` arrives and overwrites the correct result with stale data.

The fix is `AbortController`. Every time `setQuery` runs (`src/lib/searchController.ts`), it calls `cancelActive()` **before** anything else — including before the debounce timer starts. This is the point the task insists on: if we only aborted when the debounced `runSearch` fires 300 ms later, the stale response would have a 300 ms window to arrive and render under the new input text. Aborting on input immediately closes that window.

A timestamp-based "only render the latest" filter would not solve the real problem: the network request itself still runs, the response still consumes bandwidth, and the server still does work. `AbortController` actually cancels the request (visible as `canceled` in DevTools → Network) and frees resources on both ends. That is why the task forbids the flag-only approach.

In `catch` we must distinguish three cases, each with different UX:

- `AbortError` — **our own** cancellation (new input, field cleared, controller replaced). Not an error: silent, no UI message.
- `TimeoutError` — the request **we** issued did not complete within `timeoutMs`. A real failure: show error + retry button.
- `HttpError` (any non-ok status except 404) — server returned a failure. Real failure: show error + retry.
- 404 — "no matches" per API semantics. Not an error: show "Nothing found" message.

The timeout and the user-initiated abort are composed via `AbortSignal.any([controller.signal, AbortSignal.timeout(timeoutMs)])`. The reason two sources are combined into a single signal: `searchCountries` accepts exactly one `AbortSignal`, but we need to cancel on either user input or timeout. `controller.signal.aborted` is checked separately to detect **only** the user-cancelled case — a timeout does not set `controller.signal.aborted`, so the two remain distinguishable in `catch`.

## Debounce delay: why 300 ms

`debounce` (`src/lib/debounce.ts`) postpones the network call by 300 ms after the last keystroke. Trade-off:

- **0 ms** (no debounce): every keystroke fires a request. Typing `spain` → 5 requests. The server gets hammered; on slow networks the user sees a lot of intermediate states; the cache fills with junk.
- **300 ms**: fast typists collapse `spain` into 1 request; the perceived lag is below the human threshold (~350 ms feels instant for text input); first results are still visible while the user is reading what they typed.
- **1000 ms+**: user starts typing, pauses, wonders why nothing happens; second keystroke; more waiting. Feels broken.

300 ms matches the empirical value used in most search UIs (Google, Algolia, GitHub autocomplete). It is short enough to feel live, long enough to drop 90% of intermediate requests on normal typing speed.

The debounce is _not_ the cancellation mechanism. Even with 300 ms debounce, requests that did fire must be cancelled on the next input — otherwise the stale-response race is back. Both are necessary, and both are present.

## Complexity

### `mapCountryResponse` (`src/lib/mapCountry.ts`)

Let `L` be the number of languages, `C` the number of currencies, `B` the number of borders. Real data: `L <= 4`, `C <= 4`, `B <= 15`.

- Time: O(L + C + B). Every field is either O(1) or a single `map`/`join` over one array.
- Space: O(L + C + B) for the returned arrays.
- `Intl.NumberFormat` is constructed **once** at module level, not per call — so formatting a population is O(1) amortized.

### Cache, deduplication and shared-fetch cancellation (`src/lib/cache.ts`)

Both `cache` and `inFlight` are `Map<string, ...>`.

- Cache lookup (`cache.get`) — O(1) average, O(key length) worst-case for hashing. Query length is at most ~30 chars, so effectively O(1).
- Cache insert (`cache.set`) — O(1) average.
- In-flight lookup / insert (`inFlight.get` / `inFlight.set`) — O(1) average.
- Reference-count operations (`refs += 1` / `refs -= 1`) — O(1).
- The per-caller wrapper attaches one `abort` listener and one `.then` pair — O(1).

**Shared-fetch lifetime:** each in-flight entry carries its own `AbortController` and a `refs` counter. Every `cachedSearch()` caller increments `refs`. Each caller's `signal` gets an `abort` listener that decrements `refs` and, when `refs === 0`, calls `controller.abort()` — the shared network request is actually cancelled (visible as `canceled` in DevTools) when the last caller detaches. The cache itself does **not** keep the fetch alive once no UI listener is waiting for it.

Memory grows linearly with the number of distinct query strings ever searched. For a single page session with human input this is bounded by a few hundred entries at most; not a concern. A production system would add an LRU eviction; the task's scope does not require it.

## Clean code principles — where and why

- **Single Responsibility.** `searchCountries` (`src/lib/searchCountries.ts`) only does HTTP: URL building, `response.ok` check, 404-as-empty. `mapCountryResponse` (`src/lib/mapCountry.ts`) only transforms data. `debounce` (`src/lib/debounce.ts`) only schedules. `searchController` (`src/lib/searchController.ts`) only orchestrates state. Each file has a single reason to change.

- **Pure functions at the core.** `mapCountryResponse` has no side effects, no `Date.now()`, no `Math.random()`, no I/O. Same input → same output. That is what makes the 10 unit tests trivial to write and reliable (FIRST).

- **Discriminated unions over boolean flags.** `SearchState` (`src/lib/searchController.ts`) and `SearchErrorKind` (`src/lib/classifyError.ts`) are tagged unions. The UI switch (`src/ui/app.ts` `mountApp` subscribe) is exhaustive: TypeScript flags a missing case. No `state.isLoading && state.error`-style flag combinations to get out of sync.

- **Dependency injection over global lookup.** `createSearchController` accepts an optional `search` function (`src/lib/searchController.ts` `SearchControllerOptions`). In tests it receives a fake; in production it receives the real `searchCountries` (wrapped in `cachedSearch`). No `vi.mock` module-level hacks for the controller tests.

- **No `innerHTML` for dynamic content.** Everything in `src/ui/app.ts` is built with `document.createElement` via the `el` helper. This is a hard requirement in the task and a general defense against XSS: a country name from the API is data, not markup.

- **Small, named helpers instead of inline logic.** `hasName` (`src/lib/classifyError.ts`) extracts the "is this object with `name === X`" check, used by three guards. `detach` inside `cachedSearch` (`src/lib/cache.ts`) extracts the ref-count-decrement-and-maybe-abort logic. `el` (`src/ui/app.ts`) centralizes element construction with class/text. Each helper is a single named concept.

- **Fail-safe error classification.** `classifySearchError` falls back to `{ kind: 'unknown', message }` rather than throwing on unknown shapes. The UI can always render something. Robustness over strictness at the boundary.

## Bonus: cache + history

- **Cache.** `createCachedSearch` (`src/lib/cache.ts`) memoizes results by `query.trim().toLowerCase()`. Repeated identical queries are served from memory (no fetch). Empty results (404) are **not** cached — a later retry should reach the network again.
- **Deduplication.** Concurrent identical requests share a single in-flight `Promise` via `inFlight` map. Each caller gets its own abort-listener that decrements the shared `refs` counter. The underlying network request is aborted only when the **last** caller detaches, so one caller's `abort()` does not break others, but the fetch does not linger after everyone gave up.
- **History.** `createHistory` (`src/lib/history.ts`) persists the last 5 queries in `localStorage` under `country-search:history`. Duplicates are moved to the top, not duplicated. Corrupted JSON → empty history, no throw. Clicking a chip re-runs the query; if the result is in the cache, it returns instantly.
