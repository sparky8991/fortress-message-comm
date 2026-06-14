# SecureChat — Build List

Running list of outstanding work. Add items as they come up; check off when done + committed.
This is the source of truth so nothing gets lost between sessions.

## Conventions
- **Version:** bump `FORTRESS_VERSION` in `src/lib/fortress.ts` on **every user-visible update**.
  Sequence: `v2.9 → v3.0 → v3.1 → v3.2 …` (after `x.9`, roll to `(x+1).0`). Currently **v2.9**.
- **Branch:** redesign + E2E work lives on `tactical-crispness-pass` (not merged; `main` + live Netlify untouched).
- **Per change:** `npm run build` green + `npm test` green; small commits; security-sensitive diffs get `rafter-code-review`.

## Done (this pass)
- [x] Tactical crispness + message-bubble parity + green unification
- [x] App-wide legibility scale-up; header overflow + composer scrollbar regressions fixed
- [x] Tactical ID field (identity Part 1)
- [x] Mobile settings full-screen sheets; scrollbars hidden (chat, settings, composer)
- [x] E2E design doc + decisions (`docs/superpowers/specs/2026-06-14-e2e-encryption-design.md`)
- [x] E2E Phase 1: safety-number crypto + tests
- [x] E2E Phase 2 (core): X25519 keys + Argon2id wrapping + tests
- [x] `.env.example`: `VITE_FIREBASE_API_KEY` added
- [x] Version → v2.9; Rafter local secrets scan (clean)

## E2E encryption (in progress)
- [x] **Phase 2c — key bootstrap**: service (`identityKeyService` + `keySession`) + setup/unlock dialogs + opt-in Settings → Privacy & Security entry. Auto-prompt-on-login deferred to Phase 3 (when encryption activates). `rafter-code-review` on the identity flow still pending.
- [ ] **Phase 2 — Firestore rules** for identity-key fields (owner-write only). → `rafter-code-review`
- [ ] **Phase 3 — message encryption**: per-conversation ECDH key; encrypt-before-store / decrypt-on-read; mixed-state (legacy plaintext); stop storing plaintext `last_message_preview`. → `rafter-code-review`
- [ ] **Phase 4 — attachment encryption** (also closes the public Supabase bucket leak).
- [ ] **Phase 5 — verificationService** + `verifications/{me}/peers/{peer}` subcollection + rules; drop global self-grantable `profiles.verified`.
- [ ] **Phase 6 — VerifyIdentityDialog** + ChatHeader real `VERIFIED` / `UNVERIFIED` / `KEY CHANGED` badge.
- [ ] **Phase 7 — KeyChangeBanner** (MITM detection) + composer gating while `changed`.
- [ ] **Phase 8 (later)** — QR scan, forward secrecy (Double Ratchet), multi-device, group verification.

## Visual / UI
- [ ] Gray/slate legacy screens → tactical palette: `Auth` landing (confirm direction — a marketing landing may intentionally stay distinct), `Onboarding`, legacy security panels (LockdownMode, ScreenLock, EncryptedFileVault, BroadcastChannels, DeadManSwitch, BurnerIdentities, GhostSessionManager).
- [ ] Mobile: keep the Notifications number input ≥16px on mobile (avoid iOS zoom-on-focus).

## Performance (from "The Conductor Rewrite" — evaluated, worth doing)
- [ ] **Virtualize the message list** with `react-virtuoso` — render ~15 visible rows instead of the whole thread. Biggest win for long conversations. (`MessageList.tsx`)
- [ ] **`React.memo` on message bubbles** + stable keys — isolate re-renders during sends/streaming.
- [ ] (Optional, bigger, lower ROI) TanStack Router for stable route references — only if route-level re-renders become a problem.

## Evaluated — not doing now
- **TanStack Query deeper adoption** (the "gentle introduction" article): the app is real-time Firestore (`onSnapshot`). TanStack Query's REST/polling patterns (`staleTime`, refetch, backoff) don't fit push-based data. It's already installed; no rewrite warranted. Revisit only if we add REST-style fetching.

## Security
- [x] **Full Rafter SAST** (`rafter run`) — branch pushed + scanned 2026-06-14. **Our code is clean** (no SAST findings); 1 low-sev SCA warning (below).
- [ ] **Update i18next** (transitive, 3.4.2 → ≥3.4.3) — low-sev SCA finding R-6D5E2; fix via npm `overrides`, then verify build + tests.
- [ ] Firestore rules: tighten the broad collaboration-collection reads flagged in the app guide.
- [ ] Firebase Storage rules (`storage.rules`) are not tracked in the repo — add + version them.
- [x] Rafter local secrets scan — clean (only gitignored `.env` + `dist/`; keys there are public-by-design client keys).

## Docs / Deploy
- [ ] Refresh `docs/SECURECHAT_APP_GUIDE.md` (version, redesign branch, the plaintext-not-E2E finding, the E2E plan).
- [ ] When ready: merge `tactical-crispness-pass` → `main` + Netlify deploy. The **visual work is shippable independently** of E2E (E2E Phase 1–2 are unused tested libs).
