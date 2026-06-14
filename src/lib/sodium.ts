/**
 * sodium.ts — single, lazily-initialised libsodium instance.
 *
 * libsodium must finish its async `ready` before any call. Everything that needs
 * crypto awaits getSodium() so the WASM is initialised exactly once and reused.
 *
 * Phase 2 of docs/superpowers/specs/2026-06-14-e2e-encryption-design.md.
 */
import _sodium from 'libsodium-wrappers-sumo';

let readyPromise: Promise<typeof _sodium> | null = null;

export const getSodium = async (): Promise<typeof _sodium> => {
  if (!readyPromise) {
    readyPromise = _sodium.ready.then(() => _sodium);
  }
  return readyPromise;
};
