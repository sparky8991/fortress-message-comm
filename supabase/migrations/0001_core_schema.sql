-- ============================================================================
-- Fortress / SecureChat — Supabase migration  ·  STAGE 1: messaging core
-- Run in the Supabase SQL Editor of your fortress project.
-- (Teams / user_settings / statuses / ghost sessions land in Stage 1b.)
--
-- SECURITY MODEL
--   * RLS enabled + deny-by-default on every table.
--   * Access scoped to the authenticated user (auth.uid()) and conversation
--     membership. This replaces Firestore rules and makes "read everyone's
--     messages" structurally impossible — a broad query returns only YOUR rows.
--   * Wrapped private keys live in an OWNER-ONLY table (others never read them).
--   * Conversation creation goes through a validated SECURITY DEFINER RPC, so a
--     user can't self-insert into someone else's private conversation (BOLA).
--   * auth.uid() is wrapped as (select auth.uid()) per Supabase RLS perf guidance
--     (evaluated once per statement, not once per row).
-- ============================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- ── profiles ────────────────────────────────────────────────────────────────
-- Display info + the PUBLIC identity key (peers need it to encrypt to you).
-- NOTE: the wrapped PRIVATE keys are deliberately NOT here (see next table).
create table if not exists public.profiles (
  id                       uuid primary key references auth.users(id) on delete cascade,
  call_sign                text unique,
  first_name               text,
  last_name                text,
  avatar_url               text,
  bio                      text,
  show_avatar              boolean     not null default true,
  verified                 boolean     not null default false,
  tactical_id              text,
  identity_key_public      text,
  identity_key_fingerprint text,
  identity_key_updated_at  timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- Any signed-in user can read display profiles (needed for search + showing who
-- is in a chat). No secrets are exposed here.
-- FOLLOW-UP HARDENING: scope reads to shared-conversation/team peers + a search
-- RPC, to remove user enumeration. Acceptable for v1 (matches current behavior).
create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated using (true);
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create index if not exists profiles_call_sign_idx on public.profiles (lower(call_sign));

-- ── identity_private_keys ────────────────────────────────────────────────────
-- Passphrase- and recovery-wrapped private keys. OWNER-ONLY: no other user can
-- read these. (They're ciphertext, but least-privilege = nobody else sees them.)
-- This also FIXES a latent Firebase issue where wrapped keys sat on broadly
-- readable profile docs. Unwrapping is client-only.
create table if not exists public.identity_private_keys (
  user_id                      uuid primary key references auth.users(id) on delete cascade,
  wrapped_private_key          jsonb,
  wrapped_private_key_recovery jsonb,
  updated_at                   timestamptz not null default now()
);
alter table public.identity_private_keys enable row level security;

create policy "identity_keys_owner_all" on public.identity_private_keys
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ── conversations ─────────────────────────────────────────────────────────────
create table if not exists public.conversations (
  id                   uuid primary key default gen_random_uuid(),
  type                 text        not null default 'direct' check (type in ('direct','group')),
  direct_key           text        unique,  -- canonical "uidA:uidB" for direct convs; blocks duplicate DM threads
  created_by           uuid        references auth.users(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  last_message_at      timestamptz,
  last_message_preview text
);
alter table public.conversations enable row level security;

-- ── conversation_participants ────────────────────────────────────────────────
create table if not exists public.conversation_participants (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid        not null references public.conversations(id) on delete cascade,
  user_id         uuid        not null references auth.users(id) on delete cascade,
  joined_at       timestamptz not null default now(),
  role            text        not null default 'member',
  is_active       boolean     not null default true,
  unique (conversation_id, user_id)
);
alter table public.conversation_participants enable row level security;

create index if not exists cp_user_idx on public.conversation_participants (user_id) where is_active;
create index if not exists cp_conversation_idx on public.conversation_participants (conversation_id);
-- backs the is_conversation_participant() predicate (the hottest RLS check)
create index if not exists cp_conv_user_active_idx
  on public.conversation_participants (conversation_id, user_id) where is_active;

-- Membership check used by every conversation/message policy.
-- SECURITY DEFINER => bypasses RLS on conversation_participants, so the policies
-- that call it do NOT recurse. Fixed search_path => no function-hijack.
create or replace function public.is_conversation_participant(conv_id uuid)
  returns boolean language sql security definer set search_path = public, pg_temp stable
as $$
  select exists (
    select 1 from public.conversation_participants
    where conversation_id = conv_id
      and user_id = (select auth.uid())
      and is_active
  );
$$;

-- conversations: visible to participants (or the creator); created ONLY via the
-- RPC below (no client INSERT policy = direct inserts denied); updated by members.
create policy "conversations_select_member" on public.conversations
  for select to authenticated
  using (public.is_conversation_participant(id));
create policy "conversations_update_member" on public.conversations
  for update to authenticated
  using (public.is_conversation_participant(id))
  with check (public.is_conversation_participant(id));

-- participants: members see co-members; only an existing member may add a
-- participant (group adds). The DM bootstrap is the SECURITY DEFINER RPC, so
-- there is NO "add myself to any conversation_id" path (closes the BOLA hole).
create policy "participants_select_member" on public.conversation_participants
  for select to authenticated
  using (public.is_conversation_participant(conversation_id));
create policy "participants_insert_by_member" on public.conversation_participants
  for insert to authenticated
  with check (public.is_conversation_participant(conversation_id));
-- A user may update only their OWN participant row (leave = is_active false, or
-- rejoin). This intentionally does NOT let a member edit or kick OTHER members;
-- group admin/kick arrives with the group path via a role-gated RPC.
create policy "participants_update_own" on public.conversation_participants
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Validated DM bootstrap: find an existing direct conversation between the
-- caller and other_user_id, or create one + add BOTH participants atomically.
-- SECURITY DEFINER so it can seed participants under the locked-down policy
-- above; the caller is ALWAYS one of the two participants.
create or replace function public.find_or_create_direct_conversation(other_user_id uuid)
  returns uuid language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  me uuid := (select auth.uid());
  v_key text;
  conv_id uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if other_user_id is null or other_user_id = me then
    raise exception 'invalid other_user_id';
  end if;

  -- canonical, order-independent key for the pair => exactly one DM thread per
  -- pair, race-safe via the unique constraint (no more duplicate conversations).
  v_key := case when me < other_user_id
                then me::text || ':' || other_user_id::text
                else other_user_id::text || ':' || me::text end;

  insert into public.conversations (type, created_by, direct_key)
    values ('direct', me, v_key)
    on conflict (direct_key) do nothing
    returning id into conv_id;

  if conv_id is null then
    -- already existed (this call or a concurrent one): reuse it.
    select id into conv_id from public.conversations where direct_key = v_key;
  else
    insert into public.conversation_participants (conversation_id, user_id)
      values (conv_id, me), (conv_id, other_user_id);
  end if;

  return conv_id;
end;
$$;

revoke all on function public.find_or_create_direct_conversation(uuid) from public, anon;
grant execute on function public.find_or_create_direct_conversation(uuid) to authenticated;

-- ── direct_messages ───────────────────────────────────────────────────────────
create table if not exists public.direct_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid        not null references public.conversations(id) on delete cascade,
  sender_id       uuid        not null references auth.users(id) on delete cascade,
  content         text,
  message_type    text        not null default 'text'
                    check (message_type in ('text','image','file','voice','system')),
  attachment_url  text,
  attachment_name text,
  attachment_type text,
  reply_to_id     uuid        references public.direct_messages(id) on delete set null,
  encrypted       boolean     not null default false,
  sent_at         timestamptz not null default now(),
  read_at         timestamptz,
  metadata        jsonb,
  constraint dm_content_len check (content is null or char_length(content) <= 40000)
);
alter table public.direct_messages enable row level security;

create index if not exists dm_conversation_sent_idx
  on public.direct_messages (conversation_id, sent_at);

-- THE critical policy: only conversation participants read messages. Even a
-- broad client query / buggy listener returns only rows you're a participant of.
create policy "messages_select_member" on public.direct_messages
  for select to authenticated
  using (public.is_conversation_participant(conversation_id));
-- You may only send AS yourself, INTO a conversation you belong to.
create policy "messages_insert_own" on public.direct_messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and public.is_conversation_participant(conversation_id)
  );
-- Members may update (e.g. mark read_at).
create policy "messages_update_member" on public.direct_messages
  for update to authenticated
  using (public.is_conversation_participant(conversation_id))
  with check (public.is_conversation_participant(conversation_id));
