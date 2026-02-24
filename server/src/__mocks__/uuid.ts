/**
 * Mock for uuid module
 * 
 * ESM module that needs to be mocked for Jest
 */

import { randomUUID } from 'crypto';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const toUuidString = (bytes: Uint8Array): string => {
  if (bytes.length !== 16) {
    throw new TypeError('Invalid UUID byte array length');
  }
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
};

const toBytes = (value: string): Uint8Array => {
  if (!UUID_REGEX.test(value)) {
    throw new TypeError('Invalid UUID');
  }
  const hex = value.replace(/-/g, '');
  return Uint8Array.from(hex.match(/.{2}/g)?.map((chunk) => parseInt(chunk, 16)) ?? []);
};

export const v4 = jest.fn(() => randomUUID());
export const v5 = jest.fn(() => randomUUID());
export const v1 = jest.fn(() => randomUUID());
export const v3 = jest.fn(() => randomUUID());
export const validate = jest.fn((value?: string) => typeof value === 'string' && UUID_REGEX.test(value));
export const version = jest.fn((value?: string) => {
  if (typeof value !== 'string' || !UUID_REGEX.test(value)) {
    return NaN;
  }
  return Number.parseInt(value[14], 16);
});
export const parse = jest.fn((value: string) => toBytes(value));
export const stringify = jest.fn((bytes: Uint8Array) => toUuidString(bytes));
export const NIL = '00000000-0000-0000-0000-000000000000';
export const MAX = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
