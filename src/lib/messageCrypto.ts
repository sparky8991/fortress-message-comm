/**
 * messageCrypto.ts — per-conversation message encryption.
 *
 * - deriveConversationKey: X25519 ECDH (crypto_scalarmult) between my private key
 *   and the peer's public key, hashed (BLAKE2b) with the conversation id. ECDH is
 *   symmetric, so both participants derive the SAME key and can encrypt + decrypt.
 * - encrypt/decryptMessage: XChaCha20-Poly1305 AEAD with a random nonce.
 * - pack/tryUnpack: store EncryptedContent as the message `content` string and
 *   detect it on read (so legacy plaintext messages still render).
 *
 * Pure crypto, no persistence. Phase 3 of the E2E design doc. No forward secrecy
 * (static ECDH) — a known, documented limitation.
 */
import { getSodium } from './sodium';

export interface EncryptedContent {
  v: 1;
  c: string; // base64 ciphertext
  n: string; // base64 nonce
}

/** Shared per-conversation key. Symmetric across both participants. */
export const deriveConversationKey = async (
  myPrivateB64: string,
  peerPublicB64: string,
  conversationId: string,
): Promise<Uint8Array> => {
  const s = await getSodium();
  const V = s.base64_variants.ORIGINAL;
  const shared = s.crypto_scalarmult(s.from_base64(myPrivateB64, V), s.from_base64(peerPublicB64, V));
  const context = s.from_string(conversationId);
  const material = new Uint8Array(shared.length + context.length);
  material.set(shared, 0);
  material.set(context, shared.length);
  return s.crypto_generichash(s.crypto_aead_xchacha20poly1305_ietf_KEYBYTES, material);
};

export const encryptMessage = async (plaintext: string, convKey: Uint8Array): Promise<EncryptedContent> => {
  const s = await getSodium();
  const V = s.base64_variants.ORIGINAL;
  const nonce = s.randombytes_buf(s.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const ciphertext = s.crypto_aead_xchacha20poly1305_ietf_encrypt(
    s.from_string(plaintext),
    null,
    null,
    nonce,
    convKey,
  );
  return { v: 1, c: s.to_base64(ciphertext, V), n: s.to_base64(nonce, V) };
};

export const decryptMessage = async (enc: EncryptedContent, convKey: Uint8Array): Promise<string | null> => {
  const s = await getSodium();
  const V = s.base64_variants.ORIGINAL;
  try {
    const pt = s.crypto_aead_xchacha20poly1305_ietf_decrypt(
      null,
      s.from_base64(enc.c, V),
      null,
      s.from_base64(enc.n, V),
      convKey,
    );
    return s.to_string(pt);
  } catch {
    return null;
  }
};

/** Serialize EncryptedContent into the message `content` string. */
export const packEncrypted = (enc: EncryptedContent): string => JSON.stringify(enc);

/** Detect + parse encrypted content; returns null for legacy plaintext. */
export const tryUnpackEncrypted = (content: string): EncryptedContent | null => {
  if (!content || content[0] !== '{') return null;
  try {
    const parsed = JSON.parse(content);
    if (parsed && parsed.v === 1 && typeof parsed.c === 'string' && typeof parsed.n === 'string') {
      return parsed as EncryptedContent;
    }
  } catch {
    // not JSON → legacy plaintext
  }
  return null;
};
