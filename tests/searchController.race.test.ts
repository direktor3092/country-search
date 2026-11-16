import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSearchController } from '../src/lib/searchController.js';
import { makeFetchMock, partialRaw, spainRaw } from './fixtures.js';

describe('searchController race conditions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps only the latest query result when the earlier request resolves after the later one', async () => {
    const resolvers = new Map<string, (body: unknown) => void>();
    const aborted: string[] = [];
    vi.stubGlobal('fetch', makeFetchMock({ resolvers, aborted }));

    const controller = createSearchController({ debounceMs: 300, timeoutMs: 10000 });

    controller.setQuery('sp');
    vi.advanceTimersByTime(300);

    controller.setQuery('spain');
    vi.advanceTimersByTime(300);

    expect(aborted).toEqual(['sp']);
    expect(resolvers.has('sp')).toBe(true);
    expect(resolvers.has('spain')).toBe(true);

    resolvers.get('spain')?.([spainRaw]);
    await vi.advanceTimersByTimeAsync(0);

    resolvers.get('sp')?.([partialRaw]);
    await vi.advanceTimersByTimeAsync(0);

    const state = controller.getState();
    expect(state.status).toBe('results');
    if (state.status === 'results') {
      expect(state.countries).toHaveLength(1);
      expect(state.countries[0]?.name).toBe('Spain');
    }
  });
});