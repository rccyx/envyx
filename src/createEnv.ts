import type { Maybe, MaybeUndefined, UniqueArray } from 'typyx';
import { colors } from './colors';

/** ---------- minimal zod-like  ---------- */

interface ZodIssueLike {
  readonly message?: string;
}
interface ZodErrorLike {
  readonly issues?: ReadonlyArray<ZodIssueLike>;
  readonly errors?: ReadonlyArray<ZodIssueLike>;
  readonly toString?: () => string;
}
type ZodResult<O> =
  | { success: true; data: O }
  | { success: false; error: ZodErrorLike };

/**
 * Structural shape that any Zod schema matches.
 * We only rely on `_output` (for inference) and `safeParse` (for validation).
 */
type ZodLike<O = unknown> = {
  readonly _output: O;
  readonly safeParse: (value: unknown) => ZodResult<O>;
};

/** Represents a record of env var validators (all Zod-like). */
type EnvVar = Record<string, ZodLike<unknown>>;

/** Produces a runtime env type that optionally applies a prefix. */
type PrefixedRuntimeEnv<
  S extends EnvVar,
  P extends Maybe<string>,
  DisabledKeys extends readonly (keyof S & string)[],
> = {
  [K in keyof S as K extends DisabledKeys[number]
    ? K
    : P extends string
      ? `${P}_${Extract<K, string>}`
      : K]: Maybe<string>;
};

/** Configuration for createEnv. */
interface CreateOps<
  S extends EnvVar,
  P extends Maybe<string>,
  DisabledKeys extends readonly (keyof S & string)[] = [],
> {
  /** Zod schemas per variable (structural). */
  vars: S;
  /** Optional prefix for runtime keys. */
  prefix?: P;
  /** Skip validation entirely. */
  skipValidation?: boolean;
  /** Keys that should not be prefixed. */
  disablePrefix?: UniqueArray<DisabledKeys>;
  /** Custom runtime env (merged with process.env). */
  runtimeEnv?: PrefixedRuntimeEnv<S, P, DisabledKeys>;
  /**
   * When true, prints a colored summary after loading.
   * Example output:
   *   ENV → loaded 23 vars successfully.
   * If `skipValidation` is true, it appends "(skipped validation)".
   */
  log?: boolean;
}

/** Infer the validated type per key from the zod schema. */
type InferEnvVars<S extends EnvVar> = {
  [K in keyof S]: S[K] extends { readonly _output: infer OZ } ? OZ : unknown;
};

/** Rename (prefix) keys, skipping those in D. */
type RenameKeys<
  E extends Record<string, unknown>,
  P extends Maybe<string>,
  D extends string,
> = {
  [K in keyof E as K extends D
    ? K
    : P extends string
      ? K extends string
        ? `${P}_${K}`
        : K
      : K]: E[K];
};

/** Final shape after key prefixing + inference. */
type PrefixedEnvVars<
  S extends EnvVar,
  P extends Maybe<string>,
  D extends keyof S & string = never,
> = RenameKeys<InferEnvVars<S>, P, D>;

/** ---------- tiny helpers (no `any`) ---------- */
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null;

const isZodLike = (s: unknown): s is ZodLike<unknown> =>
  isObject(s) && typeof (s as { safeParse?: unknown }).safeParse === 'function';

const pickMessage = (v: unknown): string | undefined => {
  const m = (v as { readonly message?: unknown })?.message;
  return typeof m === 'string' && m.trim() ? m : undefined;
};

const extractZodMessages = (err: ZodErrorLike): string[] => {
  const out: string[] = [];
  const pushFrom = (arr: MaybeUndefined<ReadonlyArray<unknown>>): void => {
    if (!Array.isArray(arr)) return;
    for (const item of arr) out.push(pickMessage(item) ?? 'Invalid value');
  };
  pushFrom(err.issues as MaybeUndefined<ReadonlyArray<unknown>>);
  pushFrom(err.errors as MaybeUndefined<ReadonlyArray<unknown>>);
  if (!out.length && typeof err.toString === 'function') {
    const s = err.toString();
    if (typeof s === 'string' && s.trim()) out.push(s);
  }
  if (!out.length) out.push('Invalid value');
  return out;
};

/**
 * Creates a typed environment object with optional key prefixing and zod validation (structural).
 *
 * @throws if validation fails and `skipValidation` is false
 */
export function createEnv<
  S extends EnvVar,
  P extends Maybe<string> = undefined,
  D extends readonly (keyof S & string)[] = [],
>(options: CreateOps<S, P, D>): PrefixedEnvVars<S, P, D[number]> {
  const {
    vars,
    prefix,
    skipValidation = false,
    disablePrefix = [] as unknown as D,
    runtimeEnv: customRuntimeEnv,
    log = false,
  } = options;

  const runtimeEnv: Record<string, Maybe<string>> = customRuntimeEnv
    ? { ...process.env, ...customRuntimeEnv }
    : { ...process.env };

  const finalEnv: Record<string, unknown> = {};
  const groupedErrors: Record<string, string[]> = {};

  const addErr = (prefixedKey: string, msgs: readonly string[]) => {
    if (!msgs.length) return;
    (groupedErrors[prefixedKey] ??= []).push(...msgs);
  };

  if (skipValidation) {
    (Object.keys(vars) as (keyof S & string)[]).forEach((k) => {
      const shouldPrefix = !!(prefix && !disablePrefix.includes(k));
      const envKey = shouldPrefix ? `${prefix}_${k}` : k;
      finalEnv[envKey] = runtimeEnv[envKey];
    });

    if (log) {
      console.log(
        `${colors.magenta('ENV')} → loaded ${colors.green(
          String(Object.keys(finalEnv).length)
        )} vars${
          skipValidation ? ` ${colors.cyan('(skipped validation)')}` : ''
        }.`
      );
    }

    return finalEnv as PrefixedEnvVars<S, P, D[number]>;
  }

  for (const key of Object.keys(vars) as (keyof S & string)[]) {
    const validatorUnknown: unknown = vars[key];
    const shouldPrefix = !!(prefix && !disablePrefix.includes(key));
    const envKey = shouldPrefix ? `${prefix}_${key}` : key;
    const raw = runtimeEnv[envKey];

    if (!isZodLike(validatorUnknown)) {
      addErr(envKey, ['Unsupported validator (expected Zod schema)']);
      continue;
    }

    const res = validatorUnknown.safeParse(raw);
    if (res.success) {
      finalEnv[envKey] = res.data;
    } else {
      addErr(envKey, extractZodMessages(res.error));
    }
  }

  if (Object.keys(groupedErrors).length) {
    console.error('❌ Invalid environment variables:', groupedErrors);
    throw new Error('Invalid environment variables');
  }

  if (log) {
    console.log(
      `${colors.magenta('ENV')} → loaded ${colors.green(
        String(Object.keys(finalEnv).length)
      )} vars successfully.`
    );
  }

  return finalEnv as PrefixedEnvVars<S, P, D[number]>;
}
