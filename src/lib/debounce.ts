export interface DebouncedFunction<TArgs extends unknown[]> {
  (...args: TArgs): void;
  cancel(): void;
}

export function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  delay: number,
): DebouncedFunction<TArgs> {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: TArgs): void => {
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, delay);
  };

  debounced.cancel = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return debounced;
}
