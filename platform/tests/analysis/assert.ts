/**
 * node:assert/strict, mapped onto Vitest's `expect`, so the tests ported from the proof of concept
 * keep their bodies. Strict mode: `equal` is Object.is, `deepEqual` is a strict deep comparison.
 */
import { expect } from 'vitest';

type ThrowsMatcher = RegExp | string | (new (...args: never[]) => Error);

export interface Assert {
  equal(actual: unknown, expected: unknown, message?: string): void;
  notEqual(actual: unknown, expected: unknown, message?: string): void;
  deepEqual(actual: unknown, expected: unknown, message?: string): void;
  notDeepEqual(actual: unknown, expected: unknown, message?: string): void;
  ok(value: unknown, message?: string): asserts value;
  match(value: string, pattern: RegExp, message?: string): void;
  throws(fn: () => unknown, expected?: ThrowsMatcher, message?: string): void;
}

export const assert: Assert = {
  equal: (actual, expected, message) => expect(actual, message).toBe(expected),
  notEqual: (actual, expected, message) => expect(actual, message).not.toBe(expected),
  deepEqual: (actual, expected, message) => expect(actual, message).toStrictEqual(expected),
  notDeepEqual: (actual, expected, message) => expect(actual, message).not.toStrictEqual(expected),
  ok: (value, message) => expect(value, message).toBeTruthy(),
  match: (value, pattern, message) => expect(value, message).toMatch(pattern),
  throws: (fn, expected, message) => {
    if (expected === undefined) expect(fn, message).toThrow();
    else expect(fn, message).toThrow(expected);
  },
};

export default assert;
