import type { UnionToTuple, Keys } from 'ts-roids';

// ordered tuple
type Tuple<T> = UnionToTuple<Keys<T>>;

export function tuple<Schema extends object>(s: Schema): Tuple<typeof s> {
  return Object.keys(s) as Tuple<typeof s>;
}
