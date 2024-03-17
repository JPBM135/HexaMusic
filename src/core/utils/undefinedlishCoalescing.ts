export function undefinedCoalescing<V, F>(value: V | undefined, fallback: F): F | V {
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  return value === undefined ? fallback : value;
}
