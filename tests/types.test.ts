import { createEnv } from '../src/createEnv';
import { z } from 'zod';
import { TestType } from 'ts-roids';
import { expect, describe, it } from 'vitest';

type Is<One, TWo> = TestType<One, TWo, true>;
type IsNot<One, TWo> = TestType<One, TWo, false>;

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
  it('should be true', () => {
    const test: Is<string, typeof env.STR> = true;
    expect(test).toBe(true);
  });

  it('should not be false', () => {
    const test: IsNot<string, typeof env.STR> = false;
    expect(test).toBe(true);
  });

  it('should be boolean', () => {
    const test: Is<boolean, typeof env.BOOL> = true;
    expect(test).toBe(false);
  });
});
