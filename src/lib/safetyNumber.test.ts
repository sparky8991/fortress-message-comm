import { describe, expect, it } from 'vitest';
import { computeSafetyNumber, fingerprint, formatSafetyNumber } from './safetyNumber';

// Stand-in base64 "public keys" — the math only hashes bytes, so any base64 works here.
const KEY_A = btoa('alice-identity-public-key-0000000');
const KEY_B = btoa('bob---identity-public-key-0000000');
const KEY_C = btoa('carol-identity-public-key-0000000');

describe('computeSafetyNumber', () => {
  it('is deterministic for the same pair', async () => {
    expect(await computeSafetyNumber(KEY_A, KEY_B)).toBe(await computeSafetyNumber(KEY_A, KEY_B));
  });

  it('is order-independent (both peers get the same number)', async () => {
    expect(await computeSafetyNumber(KEY_A, KEY_B)).toBe(await computeSafetyNumber(KEY_B, KEY_A));
  });

  it('produces exactly 60 digits', async () => {
    expect(await computeSafetyNumber(KEY_A, KEY_B)).toMatch(/^\d{60}$/);
  });

  it('differs when the peer key differs', async () => {
    expect(await computeSafetyNumber(KEY_A, KEY_B)).not.toBe(await computeSafetyNumber(KEY_A, KEY_C));
  });
});

describe('formatSafetyNumber', () => {
  it('renders 12 groups of 5 without losing digits', async () => {
    const raw = await computeSafetyNumber(KEY_A, KEY_B);
    const formatted = formatSafetyNumber(raw);
    expect(formatted.split(' ')).toHaveLength(12);
    expect(formatted.replace(/ /g, '')).toBe(raw);
  });
});

describe('fingerprint', () => {
  it('is a 64-char hex SHA-256 and stable', async () => {
    expect(await fingerprint(KEY_A)).toMatch(/^[0-9a-f]{64}$/);
    expect(await fingerprint(KEY_A)).toBe(await fingerprint(KEY_A));
    expect(await fingerprint(KEY_A)).not.toBe(await fingerprint(KEY_B));
  });
});
