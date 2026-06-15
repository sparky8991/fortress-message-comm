/**
 * keySession.ts — in-memory holder for the unwrapped identity private key.
 *
 * The private key lives ONLY in memory for the duration of the session. It is
 * never written to disk/localStorage unwrapped, and is cleared on lock/logout.
 * Phase 2 of docs/superpowers/specs/2026-06-14-e2e-encryption-design.md.
 */
let privateKeyB64: string | null = null;

export const setSessionPrivateKey = (key: string): void => {
  privateKeyB64 = key;
};

export const getSessionPrivateKey = (): string | null => privateKeyB64;

export const clearSessionPrivateKey = (): void => {
  privateKeyB64 = null;
};

export const isUnlocked = (): boolean => privateKeyB64 !== null;
