# End-to-End Encryption + Identity Verification — Design

**Date:** 2026-06-14
**Author:** Johnathan Carlson (with Claude Code)
**Status:** Awaiting review — **no code until approved**
**Security gate:** `rafter-secure-design` walked (data-storage + key-management); `rafter-code-review` to run per build phase.

## Why this exists

Today, text messages are stored **plaintext** in Firestore with a hard-coded `encrypted: true`
flag ([conversationService.ts:201](src/services/conversationService.ts:201)), while the UI claims
"E2E ENCRYPTED · SIGNAL PROTOCOL". The Safety Number Verification feature can't be built on that —
a `VERIFIED` badge over plaintext is dangerous false confidence. This design makes the encryption
**real first**, then puts verification on top where it means something.

## Decisions (recorded)

| Fork | Decision | Why / cost |
|---|---|---|
| Crypto depth | **Pragmatic real E2E** — X25519 ECDH per conversation + AEAD | Real & correct & achievable. **No forward secrecy**: theft of an identity key exposes that user's past messages. Forward secrecy (Double Ratchet) deferred. |
| Private-key storage | **Passphrase + one-time recovery code, wrapped & synced** | Recoverable + multi-device. **Cost:** security ≤ passphrase/recovery-code strength (see Key Management). |
| Crypto implementation | **`libsodium-wrappers` only** | No hand-rolled crypto (refuse-list). X25519 + XChaCha20-Poly1305 + Argon2id, all from libsodium. |

## Architecture

1. **Identity keypair** (X25519) per user, generated client-side. Public key published to the
   profile; private key wrapped and synced (below).
2. **Per-conversation key:** `shared = X25519(myPriv, peerPub)` → `convKey = HKDF(shared, salt=conversationId)`.
   Order-independent (sort the two public keys) so both sides derive the same key.
3. **Message encryption:** `content` is encrypted with `XChaCha20-Poly1305(convKey, nonce)` **before**
   `addDoc`; the ciphertext + nonce are stored, never the plaintext. Decrypted on read in the client.
4. **`encrypted: true` becomes meaningful** — set only when content is actually ciphertext.

## Data model

### `profiles/{uid}` — add
| Field | Type | Notes |
|---|---|---|
| `identityKeyPublic` | string (b64) | X25519 public key. Published once; **owner-write only.** |
| `identityKeyFingerprint` | string | hex SHA-256(publicKey), for display + change detection. |
| `identityKeyUpdatedAt` | timestamp | Bumped on rotation (reinstall / passphrase reset). |
| `wrappedPrivateKey` | string (b64) | Private key sealed with the passphrase-derived key (see below). |
| `keyWrapParams` | object | `{ kdf: 'argon2id', salt, opslimit, memlimit, alg, nonce }` — needed to unwrap. Public params, not secret. |

> **Drop `profiles.verified` as a global boolean.** It can't represent per-relationship trust and
> would be self-grantable. Verification lives in the subcollection; badges read trust state per peer.

### `verifications/{ownerUid}/peers/{peerUid}` — new subcollection (source of truth)
| Field | Type | Notes |
|---|---|---|
| `verified` | boolean | True after a confirmed safety-number match. |
| `verifiedFingerprint` | string | Peer fingerprint *at the moment of verification*. |
| `verifiedAt` | timestamp | |
| `method` | `'qr' \| 'manual'` | |

Trust state for a peer = compare peer's **current** `identityKeyFingerprint` to my stored
`verifiedFingerprint`: equal → `verified`; record absent → `unverified`; differs → `changed` (MITM tell).

## Key management — the actual security boundary

- **Generation:** at first sign-up (and backfill on next login for existing users), generate the
  X25519 keypair client-side via libsodium.
- **Wrapping:** derive a wrapping key from a **recovery passphrase** using **Argon2id**
  (`crypto_pwhash`, interactive/moderate limits), seal the private key with
  `crypto_secretbox` (XSalsa20-Poly1305). Store `wrappedPrivateKey` + `keyWrapParams` in the profile.
- **⚠ Critical decision — the passphrase, not a PIN.** The wrapped blob is synced to the server, so
  it can be brute-forced **offline** if Firestore is breached. A 4–6 digit PIN (10^4–10^6) falls in
  seconds regardless of KDF. Therefore the wrapping secret **must be a real passphrase** (enforce
  length/strength), distinct from the screen-lock PIN. Argon2id raises the per-guess cost; the
  passphrase provides the entropy. *Open item: minimum passphrase policy (see below).*
- **Unlock:** on login, fetch `wrappedPrivateKey`, prompt for the passphrase, unwrap in memory.
  Optionally cache the unwrapped key in a **non-extractable** form / session memory; never persist
  it unwrapped.
- **Rotation / reset:** changing the passphrase re-wraps the same keypair (history preserved).
  Losing the passphrase = generate a new keypair (history encrypted to the old key is lost — a true
  E2E property) + `identityKeyUpdatedAt` bumps → peers see `KEY CHANGED`.

## Migration & mixed state

- **Legacy plaintext messages stay readable** — render any message without ciphertext as legacy.
  Only new sends are encrypted. No bulk re-encryption.
- **Stop storing `last_message_preview` in plaintext** — it currently leaks content into the
  conversation list. Encrypt it with the conversation key, or store a non-content placeholder
  ("New message") and render the decrypted preview client-side.
- **Attachments:** route image/file/voice through the conversation key too. The **public** Supabase
  bucket would then hold ciphertext — quietly closes the public-URL leak we flagged on day one.

## Verification layer (built on real E2E)

- `lib/safetyNumber.ts` — `computeSafetyNumber(myPub, peerPub)` (sorted, hashed → 60 digits),
  `formatSafetyNumber`, `fingerprint`. Pure, unit-tested.
- `services/verificationService.ts` — `getTrustState` / `markVerified` / `clearVerification`,
  reading/writing the `verifications` subcollection.
- `VerifyIdentityDialog.tsx` + `KeyChangeBanner.tsx` + `ChatHeader` trust state (real badge:
  `VERIFIED` / `UNVERIFIED` / `KEY CHANGED`), gating the composer while `changed`.

## Firestore rules (must change)

- `identityKeyPublic`, `wrappedPrivateKey`, `keyWrapParams`: **owner-write only** (`isUser(uid)`).
- `verifications/{owner}/peers/{peer}`: read/write only by `owner`.
- Remove the freely-writable global `profiles.verified`.
- (Tighten the broad collaboration-collection reads flagged in the app guide while we're here.)

## Honest limitations (disclosed in-app, not hidden)

- **No forward secrecy** — identity-key theft exposes that user's past messages.
- **Metadata is visible** to the server — who talks to whom, and when. Content is hidden; the graph isn't.
- **Recoverability ⇄ brute-force tradeoff** — synced wrapped key is only as strong as the passphrase.
- **Single fingerprint per user** — group chats verify pairwise; "fully verified channel" deferred.

## Threat model (STRIDE — inline capstone)

- **Spoofing** (impersonate jones): MITM swaps the published key → detected by `KEY CHANGED`
  (fingerprint mismatch vs. last verified) + safety-number compare. Mitigated.
- **Tampering** (alter ciphertext): AEAD (Poly1305) fails decryption → reject. Mitigated.
- **Info disclosure** (server reads messages): content is ciphertext; **metadata still exposed** (accepted, disclosed).
- **Elevation** (self-grant verified): impossible — verification is per-relationship in the owner's
  subcollection; no global self-writable flag. Mitigated by the data-model change.
- **DoS / Repudiation:** out of scope for this feature.

## Build order — each phase shippable + `rafter-code-review`'d

1. `lib/safetyNumber.ts` + libsodium wiring — pure crypto, unit tests. (No behavior change.)
2. Key bootstrap — keygen, passphrase-wrap, publish public key, store wrapped key; unlock-on-login.
3. Message encryption — encrypt-before-store / decrypt-on-read; mixed-state rendering; stop plaintext previews.
4. Attachment encryption.
5. `verificationService` + `verifications` subcollection + Firestore rules.
6. `VerifyIdentityDialog` + `ChatHeader` real badge.
7. `KeyChangeBanner` + change detection + composer gating.
8. Later: QR scan, forward secrecy, multi-device hardening, group verification.

## Resolved decisions (2026-06-14)

1. **Wrap secret — passphrase + one-time recovery code.** Key-wrap uses a real passphrase
   (≥10 chars, distinct from the screen-lock PIN) **plus** a high-entropy recovery code shown once
   at setup, via Argon2id. The recovery code is the fallback if the passphrase is forgotten; UX must
   force the user to save it at setup (lose both = lose history, by design). Strongest recoverable option.
2. **Existing-user backfill — prompt on next login.** Existing users set the passphrase + generate
   keys on next login; legacy plaintext messages remain readable. Everyone converges to E2E.
3. **Library — `libsodium-wrappers`.** Bundled Argon2id + X25519 + XChaCha20-Poly1305 (~150KB gz).

## Success criteria

- New text messages + attachments are ciphertext at rest in Firestore/Supabase (verified by reading
  a raw doc — no plaintext content).
- `encrypted: true` is set only for genuinely encrypted content.
- A peer's `VERIFIED` badge reflects a real per-relationship safety-number match; a key change flips
  it to `KEY CHANGED` and pauses the composer.
- No plaintext content in `last_message_preview`.
- `npm run build` green; legacy plaintext messages still render; no functional regression for users
  who haven't set a passphrase yet (graceful degradation).
