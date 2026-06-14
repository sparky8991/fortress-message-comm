/**
 * identityKeys.ts — X25519 identity keypairs + passphrase/recovery-code wrapping.
 *
 * - Each operator gets one long-term X25519 keypair (used for per-conversation ECDH).
 * - The private key is sealed with Argon2id (crypto_pwhash) + secretbox. The same key
 *   is wrapped TWICE — once under the passphrase, once under the recovery code — so
 *   either unlocks it (recovery code is the fallback). The wrapped blobs are safe to sync.
 * - All base64 uses the ORIGINAL (standard) variant so it interoperates with atob/btoa
 *   used elsewhere (e.g. safetyNumber.ts).
 *
 * Pure crypto — no persistence, no UI. Phase 2 of the E2E design doc.
 */
import { getSodium } from './sodium';

export interface IdentityKeyPair {
  /** base64 X25519 public key — published to the profile. */
  publicKey: string;
  /** base64 X25519 private key — kept in memory only, never stored unwrapped. */
  privateKey: string;
}

export interface WrappedKey {
  v: 1;
  ciphertext: string; // base64 sealed private key
  nonce: string; // base64 secretbox nonce
  salt: string; // base64 Argon2id salt
  opslimit: number;
  memlimit: number;
  alg: number;
}

type Strength = 'moderate' | 'interactive';

/** Generate an X25519 identity keypair. */
export const generateIdentityKeyPair = async (): Promise<IdentityKeyPair> => {
  const s = await getSodium();
  const V = s.base64_variants.ORIGINAL;
  const kp = s.crypto_box_keypair();
  return {
    publicKey: s.to_base64(kp.publicKey, V),
    privateKey: s.to_base64(kp.privateKey, V),
  };
};

/** Seal a private key under one secret (passphrase OR recovery code). */
export const wrapPrivateKey = async (
  privateKeyB64: string,
  secret: string,
  strength: Strength = 'moderate',
): Promise<WrappedKey> => {
  const s = await getSodium();
  const V = s.base64_variants.ORIGINAL;
  const salt = s.randombytes_buf(s.crypto_pwhash_SALTBYTES);
  const opslimit =
    strength === 'moderate' ? s.crypto_pwhash_OPSLIMIT_MODERATE : s.crypto_pwhash_OPSLIMIT_INTERACTIVE;
  const memlimit =
    strength === 'moderate' ? s.crypto_pwhash_MEMLIMIT_MODERATE : s.crypto_pwhash_MEMLIMIT_INTERACTIVE;
  const alg = s.crypto_pwhash_ALG_ARGON2ID13;
  const key = s.crypto_pwhash(s.crypto_secretbox_KEYBYTES, secret, salt, opslimit, memlimit, alg);
  const nonce = s.randombytes_buf(s.crypto_secretbox_NONCEBYTES);
  const ciphertext = s.crypto_secretbox_easy(s.from_base64(privateKeyB64, V), nonce, key);
  return {
    v: 1,
    ciphertext: s.to_base64(ciphertext, V),
    nonce: s.to_base64(nonce, V),
    salt: s.to_base64(salt, V),
    opslimit,
    memlimit,
    alg,
  };
};

/** Recover the private key with the matching secret; null on wrong secret. */
export const unwrapPrivateKey = async (wrapped: WrappedKey, secret: string): Promise<string | null> => {
  const s = await getSodium();
  const V = s.base64_variants.ORIGINAL;
  const key = s.crypto_pwhash(
    s.crypto_secretbox_KEYBYTES,
    secret,
    s.from_base64(wrapped.salt, V),
    wrapped.opslimit,
    wrapped.memlimit,
    wrapped.alg,
  );
  try {
    const priv = s.crypto_secretbox_open_easy(
      s.from_base64(wrapped.ciphertext, V),
      s.from_base64(wrapped.nonce, V),
      key,
    );
    return s.to_base64(priv, V);
  } catch {
    return null;
  }
};

/** High-entropy one-time recovery code, shown once at setup (160 bits, grouped). */
export const generateRecoveryCode = async (): Promise<string> => {
  const s = await getSodium();
  const bytes = s.randombytes_buf(20);
  return (s.to_hex(bytes).toUpperCase().match(/.{1,5}/g) ?? []).join('-');
};
