import { describe, expect, it } from 'vitest';
import {
  generateIdentityKeyPair,
  generateRecoveryCode,
  unwrapPrivateKey,
  wrapPrivateKey,
} from './identityKeys';

// 'interactive' KDF strength keeps the tests fast; production uses 'moderate'.

describe('generateIdentityKeyPair', () => {
  it('produces distinct base64 keypairs', async () => {
    const a = await generateIdentityKeyPair();
    const b = await generateIdentityKeyPair();
    expect(a.publicKey).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(a.publicKey).not.toBe(b.publicKey);
    expect(a.privateKey).not.toBe(b.privateKey);
  });
});

describe('wrap / unwrap', () => {
  it('round-trips with the correct secret and hides the key', async () => {
    const { privateKey } = await generateIdentityKeyPair();
    const wrapped = await wrapPrivateKey(privateKey, 'correct horse battery staple', 'interactive');
    expect(wrapped.ciphertext).not.toContain(privateKey);
    expect(await unwrapPrivateKey(wrapped, 'correct horse battery staple')).toBe(privateKey);
  });

  it('returns null for the wrong secret', async () => {
    const { privateKey } = await generateIdentityKeyPair();
    const wrapped = await wrapPrivateKey(privateKey, 'right-secret', 'interactive');
    expect(await unwrapPrivateKey(wrapped, 'wrong-secret')).toBeNull();
  });

  it('supports two independent wraps of one key (passphrase + recovery code)', async () => {
    const { privateKey } = await generateIdentityKeyPair();
    const byPass = await wrapPrivateKey(privateKey, 'my-passphrase', 'interactive');
    const byCode = await wrapPrivateKey(privateKey, 'A1B2C-D3E4F', 'interactive');
    expect(await unwrapPrivateKey(byPass, 'my-passphrase')).toBe(privateKey);
    expect(await unwrapPrivateKey(byCode, 'A1B2C-D3E4F')).toBe(privateKey);
    expect(await unwrapPrivateKey(byPass, 'A1B2C-D3E4F')).toBeNull();
  });
});

describe('generateRecoveryCode', () => {
  it('is high-entropy hex groups and unique', async () => {
    const code = await generateRecoveryCode();
    expect(code).toMatch(/^[0-9A-F]{5}(-[0-9A-F]{5})+$/);
    expect(await generateRecoveryCode()).not.toBe(code);
  });
});
