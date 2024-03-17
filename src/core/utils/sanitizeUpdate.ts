import { NOT_MODIFIED_SYMBOL } from '../../constants/common.js';

export function sanitizeUpdate<T extends Record<string, unknown | typeof NOT_MODIFIED_SYMBOL>>(
  object: T,
): Partial<{
  [P in keyof T]: Exclude<T[P], typeof NOT_MODIFIED_SYMBOL>;
}> {
  const sanitized: Partial<T> = {};
  for (const [key, value] of Object.entries(object)) {
    if (value !== NOT_MODIFIED_SYMBOL) {
      Reflect.set(sanitized, key, value);
    }
  }

  return sanitized as Partial<{
    [P in keyof T]: Exclude<T[P], typeof NOT_MODIFIED_SYMBOL>;
  }>;
}
