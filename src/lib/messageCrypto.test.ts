import { describe, expect, it } from 'vitest';
import { generateIdentityKeyPair } from './identityKeys';
import {
  decryptMessage,
  deriveConversationKey,
  encryptMessage,
  packEncrypted,
  tryUnpackEncrypted,
} from './messageCrypto';
import { getSodium } from './sodium';

const hex = async (k: Uint8Array) => (await getSodium()).to_hex(k);

describe('deriveConversationKey', () => {
  it('both participants derive the same key (ECDH symmetry)', async () => {
    const a = await generateIdentityKeyPair();
    const b = await generateIdentityKeyPair();
    const ka = await deriveConversationKey(a.privateKey, b.publicKey, 'conv-1');
    const kb = await deriveConversationKey(b.privateKey, a.publicKey, 'conv-1');
    expect(await hex(ka)).toBe(await hex(kb));
  });

  it('differs per conversation id', async () => {
    const a = await generateIdentityKeyPair();
    const b = await generateIdentityKeyPair();
    const k1 = await deriveConversationKey(a.privateKey, b.publicKey, 'conv-1');
    const k2 = await deriveConversationKey(a.privateKey, b.publicKey, 'conv-2');
    expect(await hex(k1)).not.toBe(await hex(k2));
  });
});

describe('encrypt / decrypt', () => {
  it('round-trips between two participants and hides plaintext', async () => {
    const a = await generateIdentityKeyPair();
    const b = await generateIdentityKeyPair();
    const ka = await deriveConversationKey(a.privateKey, b.publicKey, 'c');
    const kb = await deriveConversationKey(b.privateKey, a.publicKey, 'c');
    const enc = await encryptMessage('RENDEZVOUS AT 0300', ka);
    expect(JSON.stringify(enc)).not.toContain('RENDEZVOUS');
    expect(await decryptMessage(enc, kb)).toBe('RENDEZVOUS AT 0300');
  });

  it('returns null with the wrong key', async () => {
    const a = await generateIdentityKeyPair();
    const b = await generateIdentityKeyPair();
    const c = await generateIdentityKeyPair();
    const ka = await deriveConversationKey(a.privateKey, b.publicKey, 'c');
    const wrong = await deriveConversationKey(a.privateKey, c.publicKey, 'c');
    const enc = await encryptMessage('secret', ka);
    expect(await decryptMessage(enc, wrong)).toBeNull();
  });

  it('returns null on tampered ciphertext', async () => {
    const a = await generateIdentityKeyPair();
    const b = await generateIdentityKeyPair();
    const k = await deriveConversationKey(a.privateKey, b.publicKey, 'c');
    const enc = await encryptMessage('hello', k);
    const flipped = enc.c[0] === 'A' ? 'B' : 'A';
    expect(await decryptMessage({ ...enc, c: flipped + enc.c.slice(1) }, k)).toBeNull();
  });
});

describe('pack / unpack', () => {
  it('packs encrypted content and ignores legacy plaintext', async () => {
    const a = await generateIdentityKeyPair();
    const b = await generateIdentityKeyPair();
    const k = await deriveConversationKey(a.privateKey, b.publicKey, 'c');
    const enc = await encryptMessage('hi', k);
    expect(tryUnpackEncrypted(packEncrypted(enc))).toEqual(enc);
    expect(tryUnpackEncrypted('just a normal message')).toBeNull();
    expect(tryUnpackEncrypted('{"not":"ours"}')).toBeNull();
  });
});
