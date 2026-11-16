// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createHistory } from '../src/lib/history.js';

const STORAGE_KEY = 'country-search:history';

describe('search history', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('persists a query to localStorage', () => {
    const history = createHistory();
    history.add('spain');
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual(['spain']);
  });

  it('returns stored queries in order', () => {
    const history = createHistory();
    history.add('spain');
    history.add('japan');
    expect(history.get()).toEqual(['japan', 'spain']);
  });

  it('moves a repeated query to the top without duplicating it', () => {
    const history = createHistory();
    history.add('spain');
    history.add('japan');
    history.add('spain');
    expect(history.get()).toEqual(['spain', 'japan']);
  });

  it('keeps only the five most recent queries', () => {
    const history = createHistory();
    for (const q of ['a', 'b', 'c', 'd', 'e', 'f']) history.add(q);
    expect(history.get()).toEqual(['f', 'e', 'd', 'c', 'b']);
  });

  it('clears the history and tolerates corrupted storage', () => {
    const history = createHistory();
    history.add('spain');
    history.clear();
    expect(history.get()).toEqual([]);

    window.localStorage.setItem(STORAGE_KEY, 'not json');
    expect(createHistory().get()).toEqual([]);
  });
});
