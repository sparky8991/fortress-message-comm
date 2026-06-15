# SecureChat — Build List

Running list of outstanding work. Add items as they come up; check off when done + committed.
This is the source of truth so nothing gets lost between sessions.

## Conventions
- **Version:** bump `FORTRESS_VERSION` in `src/lib/fortress.ts` on **every user-visible update**.
  Sequence: `v2.9 → v3.0 → v3.1 → v3.2 …` (after `x.9`, roll to `(x+1).0`). Currently **v3.4**.
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
- **Phase 3 — message encryption** (in progress):
  - [x] **3a** — `messageCrypto.ts`: ECDH conversation key (X25519 → BLAKE2b/conv-id) + XChaCha20-Poly1305 encrypt/decrypt + pack/unpack + 6 tests.
  - [x] **3b** — `messageEncryption` (conv-key cache + encryptOutgoing/decryptIncoming); encrypt-on-send + decrypt-on-read wired into `conversationService` + `useDirectMessages`; honest `encrypted` flag; no plaintext preview; **plaintext fallback** when locked / no peer key; conv-key cache cleared on lock. **✓ VERIFIED end-to-end (2026-06-15)** — two-account test (Sparky↔jones) confirmed ciphertext at rest in Firestore (XChaCha20-Poly1305 `{v,c,n}`), decrypted correctly on the peer; the plaintext appears nowhere on the server.
  - [ ] **3 follow-ups**: re-decrypt displayed messages right after unlock (currently shows "unlock to read" until you switch conversations / a new message arrives); optional per-conversation "require encryption" mode (block the silent plaintext fallback); formal `rafter-code-review` of the encryption wiring.
- [ ] **Phase 4 — attachment encryption** (also closes the public Supabase bucket leak).
- [ ] **Phase 5 — verificationService** + `verifications/{me}/peers/{peer}` subcollection + rules; drop global self-grantable `profiles.verified`.
- [ ] **Phase 6 — VerifyIdentityDialog** + ChatHeader real `VERIFIED` / `UNVERIFIED` / `KEY CHANGED` badge.
- [ ] **Phase 7 — KeyChangeBanner** (MITM detection) + composer gating while `changed`.
- [ ] **Phase 8 (later)** — QR scan, forward secrecy (Double Ratchet), multi-device, group verification.

## Mobile redesign + libsodium fix (v3.3 — this pass)
- [x] **libsodium + Vite**: `optimizeDeps.include` (not exclude) so it pre-bundles cleanly — fixed the setup hang + blank-page/reload-loop. Cleared stale `.vite` cache.
- [x] **E2E setup hardening**: per-step codes (E10–E99) + per-step timeouts in `setupIdentityKeys` so setup can't hang silently; coded errors surface in the dialog; no secrets logged.
- [x] **Mobile redesign** (`Mobile App Mockup.dc.html`): full-screen list home (bottom nav drives Chats/Teams/Security tabs) + full-screen conversation with ‹ back; compose FAB → bottom-right; attach bottom sheet (Photo/File/Voice/GIF → existing handlers); pill composer (single +, inline emoji, 44px targets). Desktop composer untouched (`hidden md:flex`).
- [ ] Mobile follow-ups: attach-sheet self-destruct timer selector (backend supports only the fixed 2-min burn today); shorten the composer footer line on mobile.

## PWA (next phase — already installable)
- [x] Installable today: `sw.js` + `site.webmanifest` + 192/512 icons + iOS splash present.
- [x] **SW reload-loop hotfix (v3.5)** — removed the `controllerchange` → `location.reload()` + forced `registration.update()` from index.html that bounced the live site (blank/refresh loop) after a deploy. SW updates now apply on the next navigation. Production build re-verified via local preview (landing renders clean, no JS errors).
- [ ] **Responsive container-width layout** (`react-handoff/PWA_PLAN.md`): add `useLayoutMode` (ResizeObserver) → wide (≥900 two-pane) / compact (600–899 icon rail + single pane + back) / narrow (<600 = mobile build). Optionally migrate `sw.js` → `vite-plugin-pwa`/Workbox.

## Visual / UI
- [x] **Landing page (`Auth.tsx`) tactical redesign + feature sync** (v3.4) — reskinned slate/emerald → FORTRESS green/black terminal, coded glassmorphic hero, E2E-led feature story (claims softened to match the opt-in key setup + plaintext fallback). Also: `SettingRow`/`StatusPill` box-fit fixes.
- [ ] Remaining gray/slate screens → tactical: `Onboarding`, legacy security panels (LockdownMode, ScreenLock, EncryptedFileVault, BroadcastChannels, DeadManSwitch, BurnerIdentities, GhostSessionManager).
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
- [ ] When ready: merge `tactical-crispness-pass` → `main` + Netlify deploy (live builds from `main`). Phase 3 E2E is now **verified live** (ciphertext at rest confirmed), so the messaging path is safe to ship. Remaining queued: landing-page tactical redesign + PWA responsive layout.
