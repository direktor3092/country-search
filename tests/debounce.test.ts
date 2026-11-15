import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { debounce } from '../src/lib/debounce.js';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not call the function synchronously', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced();

    expect(fn).not.toHaveBeenCalled();
  });

  it('calls the function once after the delay elapses', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced();
    vi.advanceTimersByTime(299);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('resets the timer when called again within the delay', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced();
    vi.advanceTimersByTime(200);
    debounced();
    vi.advanceTimersByTime(200);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('calls the function with the arguments of the last call', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced('first', 1);
    debounced('second', 2);
    debounced('last', 3);

    vi.advanceTimersByTime(300);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('last', 3);
  });

  it('collapses a burst of rapid calls into a single invocation', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    for (let i = 0; i < 5; i += 1) {
      debounced();
      vi.advanceTimersByTime(50);
    }
    vi.advanceTimersByTime(300);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('cancel() prevents the pending call from firing', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced();
    debounced.cancel();
    vi.advanceTimersByTime(300);

    expect(fn).not.toHaveBeenCalled();
  });

  it('cancel() is safe to call when nothing is scheduled', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    expect(() => debounced.cancel()).not.toThrow();
  });
});
