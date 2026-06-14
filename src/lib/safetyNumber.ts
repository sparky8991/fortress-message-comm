/**
 * safetyNumber.ts — pure helpers for Signal-style identity verification.
 *
 * The safety number is derived only from the two parties' PUBLIC identity keys,
 * so it reveals nothing secret and is safe to display or scan. Both sides compute
 * the same value because the inputs are sorted before hashing.
 *
 * Uses the Web Crypto API (SHA-256) — the same primitive already used elsewhere
 * in the app. libsodium (X25519 / Argon2id) arrives in Phase 2 with real keypairs;
 * this file needs no external dependency.
 *
 * Phase 1 of docs/superpowers/specs/2026-06-14-e2e-encryption-design.md.
 */

const SAFETY_NUMBER_DIGITS = 60;

const decodeBase64 = (b64: string): Uint8Array => {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

const sha256 = async (data: Uint8Array): Promise<Uint8Array> =>
  new Uint8Array(await crypto.subtle.digest('SHA-256', data));

/** Hex SHA-256 of a base64 public key — the displayed/stored key fingerprint. */
export const fingerprint = async (publicKeyB64: string): Promise<string> =>
  toHex(await sha256(decodeBase64(publicKeyB64)));

/**
 * 60-digit safety number from two base64 public keys.
 * Order-independent: the keys are sorted first, so both peers derive the same value.
 */
export const computeSafetyNumber = async (keyA: string, keyB: string): Promise<string> => {
  const [first, second] = [keyA, keyB].sort();
  const digest = await sha256(new TextEncoder().encode(`${first}${second}`));
  let digits = '';
  for (let i = 0; i < digest.length && digits.length < SAFETY_NUMBER_DIGITS; i += 1) {
    digits += (digest[i] % 100).toString().padStart(2, '0');
  }
  return digits.slice(0, SAFETY_NUMBER_DIGITS);
};

/** "60923 11487 …" — 12 groups of 5 digits, matching the verification mockup. */
export const formatSafetyNumber = (raw: string): string => (raw.match(/.{1,5}/g) ?? []).join(' ');
