# Supabase Migration — Design

**Status:** draft for review · **Date:** 2026-06-15 · **Author:** Johnathan + Claude

## Goal & constraints

Move the backend off **Firebase** (Auth + Firestore + real-time) onto **Supabase** (Auth + Postgres + Realtime + Storage). Storage is already on Supabase.

- **Use the existing dedicated fortress Supabase project** — don't create a new one. Add tables + RLS + auth to the project that already holds the `chat-attachments` bucket. The app's `VITE_SUPABASE_URL` + anon key are already wired in.
- **No managed billing.** Run on the Supabase **free tier** now. When we outgrow it (storage cap, the 7-day idle pause, or real users), move to **self-hosted Supabase on a VPS + Cloudflare R2** — a *redeploy, not a rewrite* (same schema/RLS/auth/app code).
- **Fresh start** — new empty database, no data migration (test accounts only). Users re-register on Supabase Auth.
- **App keeps working throughout** — stand up Supabase alongside Firebase, cut over per-stage.
- **SQL applied by the user** in the Supabase dashboard (Claude's Supabase access is a different "Wellosapp" account and can't reach this project). Claude writes every migration; user clicks Run.

## Why this is a security upgrade (not just an escape from the quota)

1. **Row-Level Security (RLS) at the database layer** makes the "read all conversations" leak we just fixed *structurally impossible* — even a broad client query (or a misbehaving listener) returns **only the caller's own rows**. The DB, not client code, is the enforcement boundary.
2. **Auth-scoped storage** — once uploads carry a Supabase Auth JWT, Storage RLS scopes files to the owner. That closes the public/anonymous `chat-attachments` bucket and *is* the foundation for Phase 4 (private, encrypted attachments).
3. **Typed schema** — Postgres columns + constraints kill Firestore's schemaless mass-assignment risk (you can't write a field that doesn't exist / isn't permitted).
4. **One identity** across DB + storage + realtime (today they're split: Firebase identity can't authorize Supabase storage, which is *why* uploads had to be anonymous).

---

## Security design (rafter-secure-design pass)

### AuthN — who the user is
- **End users (humans).** Primitive: **Supabase Auth (GoTrue)** — JWT access token (~1 h) + **rotating refresh token** (Supabase handles rotation + reuse detection + revocation). We do **not** roll our own JWT or password hashing.
- **Providers:** **email/password only** for now (bcrypt, Supabase-managed). Fresh start — everyone re-registers, no UID migration. **Google deferred** — a quick add-later in Supabase; no Google OAuth setup needed yet.
- **Hardening to enable:** Supabase "leaked password protection" (HaveIBeenPwned check) + a sane min length. **MFA (TOTP)** is supported by Supabase — *out of scope for the migration, flagged as a future Fortress enhancement.*

### AuthZ — model the access
- **Mixed model, enforced by Postgres RLS:**
  - **Ownership** — your own `profiles` row, your own `user_settings` (read/write self only).
  - **Relationship (ReBAC-ish)** — `direct_messages` / `conversations` readable only by **conversation participants**; team data by **team members**.
  - **RBAC** — team roles (`diamond_in_the_rough` > `team_lead` > `team_organizer` > `team_user`) gate team-management writes.
- **Enforced at the database**, via RLS on **every** table — deny-by-default, then grant scoped to `auth.uid()` + membership. Membership checks live in `SECURITY DEFINER` helper functions (e.g. `is_conversation_participant(conv_id)`) to keep policies clean and avoid recursive-RLS pitfalls.
- **IDOR/BOLA:** there is no "fetch by id and hope" — RLS scopes the row to the caller. User id always comes from the **session** (`auth.uid()`), never a request parameter.

### Data classification & at-rest
| Class | Fields | Handling |
|---|---|---|
| Credential | passwords | `auth.users`, bcrypt, **Supabase-managed — we never touch** |
| Credential (sealed) | `wrappedPrivateKey`, `wrappedPrivateKeyByRecovery` | ciphertext blobs on `profiles`; unwrap is **client-only**. Safe at rest. |
| PII | email, names, avatar, bio, callSign | `auth.users` + `profiles`; GDPR scope |
| Content | message text, attachments | E2E messages = **ciphertext at rest**; plaintext-fallback + metadata readable by DB; attachments plaintext until Phase 4 |
- **At rest:** rely on Supabase/Postgres managed disk encryption (and VPS full-disk encryption when self-hosted). **No extra field-encryption** — the E2E layer already seals the sensitive content client-side (XChaCha20 messages, Argon2id-wrapped keys). Adding a second layer would break queries for no gain.

### Secrets
- **Anon key** → client (public by design; **RLS is the real gate**, not the key).
- **`service_role` key** (bypasses RLS) → **never in the client**, never in the repo. This app's client uses anon + RLS only, so the service role isn't needed in app code at all.
- **Google OAuth client secret** → stored in Supabase Auth config, not the app.
- In transit: TLS everywhere (managed on Cloud; Caddy/Let's-Encrypt to set up on the VPS later).

### Retention & deletion
- **Account deletion** path must cascade: `profiles`, the user's `direct_messages`/participations, team memberships, settings, statuses, keys. Define FK `ON DELETE` + an explicit "delete my account" flow. (GDPR.)
- **Ephemeral data** already exists and ports over: statuses (24 h), ghost messages (burn), message auto-delete windows → enforced via `expires_at` columns + a scheduled cleanup (`pg_cron` or a periodic job) **and** RLS/queries that hide expired rows.

### Ingestion / file uploads
- **Now auth-scoped:** uploads carry the Supabase JWT; Storage RLS enforces the `users/{auth.uid()}/conversations/{id}/…` path (the `{uid}` is the *authenticated* user, not an anonymous claim). Keep the extension+MIME allowlist we already wrote; keep random `timestamp-uuid` filenames; keep blocking `svg`/`html`/scriptable types.
- **Serving origin** is the Supabase domain (separate from the app origin) — good XSS isolation.
- **Column-level input limits:** add `CHECK` constraints / length caps (message length, field sizes) — Postgres enforces shape that Firestore never did.
- **Phase 4 (after migration):** encrypt attachments client-side → flip bucket private → serve via short-lived signed URLs. Natural once auth + RLS are in place.

### Refuse-list check
No homegrown auth/crypto (Supabase Auth + maintained libsodium). No `alg:none`. User id from session, not request. `service_role` never client-side. Uploads: random names ✓, allowlist ✓, separate origin ✓, no SVG/HTML ✓. RLS at DB, not just client. **All clear.**

---

## Schema (Firestore collections → Postgres tables)

`profiles` (id = `auth.users.id`), `teams`, `team_members`, `team_invitations`, `conversations`, `conversation_participants`, `direct_messages`, `ghost_sessions`, `ghost_messages`, `user_settings`, `statuses` — relational, with FKs + indexes (notably `direct_messages(conversation_id, sent_at)`).

**RLS is the critical artifact** — `direct_messages` is the highest-risk table (private content). Its policy: read/write only where `is_conversation_participant(conversation_id)`. Every table gets reviewed with `rafter-code-review` when the policies are written (Stage 1).

## Realtime (onSnapshot → Supabase Realtime)
- `onSnapshot(messages where conversation_id == X)` → `supabase.channel().on('postgres_changes', { table: 'direct_messages', filter: 'conversation_id=eq.X' })`.
- **Realtime respects RLS** — clients only receive change events for rows they're allowed to read. The global-listener anti-pattern that burned the quota/leaked data **cannot recur**: scope it broadly and RLS still filters to your rows.

## E2E encryption
Unchanged. It's client-side (`lib/identityKeys.ts`, `messageCrypto.ts`, `keySession.ts`). Only change: the wrapped keys read/write from the `profiles` **table** instead of a Firestore doc — a small edit in `identityKeyService.ts`. Crypto, passphrase, recovery code: identical.

---

## Staged migration (app stays working the whole way)

| Stage | Work | Gate |
|---|---|---|
| **0** | This design doc | `rafter-secure-design` ✓ → **your review** |
| **1** | Schema + RLS + Storage-RLS migrations (SQL). You run them in the dashboard. | `rafter-code-review` on the RLS |
| **2** | Supabase Auth (email/password) + swap the app's auth layer | `rafter-code-review` |
| **3** | Port data services (conversation/settings/status/identity) Firebase→Supabase client, table by table | `rafter-code-review` per service |
| **4** | Port realtime hooks (onSnapshot → Realtime) | verify live updates |
| **5** | Move E2E key storage to `profiles` table | verify unlock + decrypt |
| **6** | Cut over, remove Firebase deps, full E2E + file-send test | `rafter run` on the branch |
| **7** *(later)* | Self-host on VPS + R2 when outgrowing free | redeploy, not rewrite |

## Decisions
1. **Auth: email/password only for now.** ✓ Fresh sign-ups — everyone re-registers. Google deferred (easy to add in Supabase later; no OAuth setup needed now).
2. **MFA: out of scope** for the migration (future Fortress enhancement). ✓
3. **Account deletion: fast-follow** — a proper GDPR delete flow right after cut-over, not blocking the migration. *(say the word if you want it in-scope)*
