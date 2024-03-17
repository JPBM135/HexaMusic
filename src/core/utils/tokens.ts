import { container } from 'tsyringe';
import type { TokenMap } from '../../tokens.js';

export function resolveToken<T extends keyof TokenMap>(token: T): TokenMap[T] {
  return container.resolve(token);
}

export function registerToken<T extends keyof TokenMap>(token: T, value: TokenMap[T]) {
  container.register(token, { useValue: value });
}
