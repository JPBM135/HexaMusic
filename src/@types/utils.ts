import type { NOT_MODIFIED_SYMBOL } from '../constants/common.js';

export type TypedOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export type SelectiveUpdate<T> = {
  [P in keyof T]?: T[P] | typeof NOT_MODIFIED_SYMBOL;
};
