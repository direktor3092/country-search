import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSearchController } from '../src/lib/searchController.js';
import { makeFetchMock } from './fixtures.js';

describe('searchController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('aborts the previous request immediately when the query changes', () => {
    const resolvers = new Map<string, (body: unknown) => void>();
    const aborted: string[] = [];
    vi.stubGlobal('fetch', makeFetchMock({ resolvers, aborted }));

    const controller = createSearchController({ debounceMs: 300, timeoutMs: 10000 });

    controller.setQuery('sp');
    vi.advanceTimersByTime(300);
    expect(controller.getState()).toEqual({ status: 'loading', query: 'sp' });

    controller.setQuery('spain');
    expect(aborted).toEqual(['sp']);
  });

  it('treats an empty result list as the empty state, not an error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(null, { status: 404 }))),
    );
    const controller = createSearchController({ debounceMs: 300, timeoutMs: 10000 });

    controller.setQuery('zzzz');
    vi.advanceTimersByTime(300);
    await vi.advanceTimersByTimeAsync(0);

    expect(controller.getState()).toEqual({ status: 'empty', query: 'zzzz' });
  });

  it('moves to the error state on an HTTP failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(null, { status: 500 }))),
    );
    const controller = createSearchController({ debounceMs: 300, timeoutMs: 10000 });

    controller.setQuery('spain');
    vi.advanceTimersByTime(300);
    await vi.advanceTimersByTimeAsync(0);

    const state = controller.getState();
    expect(state.status).toBe('error');
    if (state.status === 'error') {
      expect(state.error.kind).toBe('http');
    }
  });

  it('retries the last query and recovers from an error', async () => {
    let calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        calls += 1;
        if (calls === 1) {
          return Promise.resolve(new Response(null, { status: 500 }));
        }
        return Promise.resolve(
          new Response(JSON.stringify([]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      }),
    );
    const controller = createSearchController({ debounceMs: 300, timeoutMs: 10000 });

    controller.setQuery('spain');
    vi.advanceTimersByTime(300);
    await vi.advanceTimersByTimeAsync(0);
    expect(controller.getState().status).toBe('error');

    controller.retry();
    await vi.advanceTimersByTimeAsync(0);
    expect(controller.getState().status).toBe('empty');
  });

  it('returns to idle and cancels pending work when the query is cleared', () => {
    const resolvers = new Map<string, (body: unknown) => void>();
    const aborted: string[] = [];
    vi.stubGlobal('fetch', makeFetchMock({ resolvers, aborted }));

    const controller = createSearchController({ debounceMs: 300, timeoutMs: 10000 });

    controller.setQuery('spain');
    vi.advanceTimersByTime(300);
    controller.setQuery('');

    expect(controller.getState()).toEqual({ status: 'idle' });
    expect(aborted).toEqual(['spain']);
  });
});