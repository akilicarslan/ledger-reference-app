import { useEffect, useState } from 'react';

/**
 * Returns `value` after it has not changed for `delayMs`.
 * Use it to send one search request after the user stops typing.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
