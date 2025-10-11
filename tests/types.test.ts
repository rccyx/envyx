import { createEnv } from '../src/createEnv';
import { z } from 'zod';
import { Not, Equals } from 'ts-roids';
import { expect, describe, it } from 'vitest';

type Is<One, Two> = Equals<One, Two>;
type IsNot<One, Two> = Not<Is<One, Two>>;

export const env = createEnv({
  vars: {
    STR: z.string(),
    NUM: z.number(),
    BOOL: z.boolean(),
    DATE: z.date(),
    ARRAY: z.array(z.string()),
    OBJECT: z.object({
      name: z.string(),
      age: z.number(),
    }),
    ENUM: z.enum(['a', 'b', 'c']),
    NULL: z.null(),
    UNDEFINED: z.undefined(),
    NEVER: z.never(),
    UNKNOWN: z.unknown(),
    ANY: z.any(),
  },
});

describe('types', () => {
  it('infers STR as string', () => {
    const test: Is<string, typeof env.STR> = true;
    expect(test).toBe(true);
  });

  it('does not infer STR as number', () => {
    const test: IsNot<number, typeof env.STR> = true;
    expect(test).toBe(true);
  });

  it('infers NUM as number', () => {
    const test: Is<number, typeof env.NUM> = true;
    expect(test).toBe(true);
  });

  it('does not infer NUM as string literal', () => {
    const test: IsNot<'number', typeof env.NUM> = true;
    expect(test).toBe(true);
  });

  it('infers BOOL as boolean', () => {
    const test: Is<boolean, typeof env.BOOL> = true;
    expect(test).toBe(true);
  });

  it('does not infer BOOL as number', () => {
    const test: IsNot<number, typeof env.BOOL> = true;
    expect(test).toBe(true);
  });

  it('infers DATE as Date', () => {
    const test: Is<Date, typeof env.DATE> = true;
    expect(test).toBe(true);
  });

  it('does not infer DATE as string', () => {
    const test: IsNot<string, typeof env.DATE> = true;
    expect(test).toBe(true);
  });

  it('infers ARRAY as string[]', () => {
    const test: Is<string[], typeof env.ARRAY> = true;
    expect(test).toBe(true);
  });

  it('does not infer ARRAY as number[]', () => {
    const test: IsNot<number[], typeof env.ARRAY> = true;
    expect(test).toBe(true);
  });

  it('infers OBJECT shape exactly', () => {
    const test: Is<{ name: string; age: number }, typeof env.OBJECT> = true;
    expect(test).toBe(true);
  });

  it('does not widen OBJECT to extra props', () => {
    const test: IsNot<
      { name: string; age: number; other: string },
      typeof env.OBJECT
    > = true;
    expect(test).toBe(true);
  });

  it('infers ENUM as "a" | "b" | "c"', () => {
    const test: Is<'a' | 'b' | 'c', typeof env.ENUM> = true;
    expect(test).toBe(true);
  });

  it('does not infer ENUM as single literal', () => {
    const test: IsNot<'a', typeof env.ENUM> = true;
    expect(test).toBe(true);
  });

  it('infers NULL as null', () => {
    const test: Is<null, typeof env.NULL> = true;
    expect(test).toBe(true);
  });

  it('NULL is not undefined', () => {
    const test: IsNot<undefined, typeof env.NULL> = true;
    expect(test).toBe(true);
  });

  it('infers UNDEFINED as undefined', () => {
    const test: Is<undefined, typeof env.UNDEFINED> = true;
    expect(test).toBe(true);
  });

  it('UNDEFINED is not null', () => {
    const test: IsNot<null, typeof env.UNDEFINED> = true;
    expect(test).toBe(true);
  });

  it('infers NEVER as never', () => {
    const test: Is<never, typeof env.NEVER> = true;
    expect(test).toBe(true);
  });

  it('NEVER is not unknown', () => {
    const test: IsNot<unknown, typeof env.NEVER> = true;
    expect(test).toBe(true);
  });

  it('infers UNKNOWN as unknown', () => {
    const test: Is<unknown, typeof env.UNKNOWN> = true;
    expect(test).toBe(true);
  });

  it('UNKNOWN is not string', () => {
    const test: IsNot<string, typeof env.UNKNOWN> = true;
    expect(test).toBe(true);
  });

  it('infers ANY as any', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const test: Is<any, typeof env.ANY> = true;
    expect(test).toBe(true);
  });

  it('ANY is not narrowed to string', () => {
    const test: IsNot<'hello', typeof env.ANY> = true;
    expect(test).toBe(true);
  });
});
