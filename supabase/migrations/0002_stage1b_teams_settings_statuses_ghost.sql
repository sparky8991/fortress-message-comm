-- ============================================================================
-- Fortress / SecureChat — Supabase migration  ·  STAGE 1b
-- teams, team_members, team_invitations, user_settings, statuses,
-- ghost_sessions, ghost_session_members, ghost_messages.
-- (Stage 1a core messaging schema is already applied + hardened.)
--
-- Same security model as Stage 1a: RLS deny-by-default on every table; access
-- scoped to auth.uid() + membership/ownership via SECURITY DEFINER helpers
-- (fixed search_path, non-recursive). Bootstrap flows that a plain RLS check
-- can't safely express (invite acceptance) go through SECURITY DEFINER RPCs.
-- auth.uid() is wrapped as (select auth.uid()) per Supabase RLS perf guidance.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ── teams ─────────────────────────────────────────────────────────────────
create table if not exists public.teams (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 200),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.teams enable row level security;

create table if not exists public.team_members (
  id        uuid primary key default gen_random_uuid(),
  team_id   uuid not null references public.teams(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  role      text not null default 'team_user'
              check (role in ('diamond_in_the_rough','team_lead','team_organizer','team_user')),
  joined_at timestamptz not null default now(),
  unique (team_id, user_id)
);
alter table public.team_members enable row level security;
create index if not exists tm_team_idx on public.team_members (team_id);
create index if not exists tm_user_idx on public.team_members (user_id);
create index if not exists tm_team_user_idx on public.team_members (team_id, user_id);

create table if not exists public.team_invitations (
  id              uuid primary key default gen_random_uuid(),
  team_id         uuid not null references public.teams(id) on delete cascade,
  invitation_code text not null unique,
  email           text,
  role            text not null default 'team_user'
                    check (role in ('team_lead','team_organizer','team_user')),
  status          text not null default 'pending' check (status in ('pending','accepted')),
  expires_at      timestamptz not null,
  created_at      timestamptz not null default now(),
  accepted_by     uuid references auth.users(id) on delete set null,
  accepted_at     timestamptz
);
alter table public.team_invitations enable row level security;
create index if not exists ti_code_idx on public.team_invitations (invitation_code);
create index if not exists ti_team_idx on public.team_invitations (team_id);

-- ── user_settings (owner-only; nested settings as jsonb) ────────────────────
create table if not exists public.user_settings (
  user_id               uuid primary key references auth.users(id) on delete cascade,
  notification_settings jsonb,
  security_settings     jsonb,
  appearance_settings   jsonb,
  call_settings         jsonb,
  chat_settings         jsonb,
  theme_settings        jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
alter table public.user_settings enable row level security;

-- ── statuses (24h text/image; readable while active) ────────────────────────
create table if not exists public.statuses (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  content_type     text not null check (content_type in ('text','image')),
  content          text,
  background_color text,
  views            uuid[] not null default '{}',
  created_at       timestamptz not null default now(),
  expires_at       timestamptz not null
);
alter table public.statuses enable row level security;
create index if not exists status_active_idx on public.statuses (expires_at);

-- ── ghost sessions (team-scoped, ephemeral, client-encrypted) ───────────────
create table if not exists public.ghost_sessions (
  id                  uuid primary key default gen_random_uuid(),
  session_name        text,
  team_id             uuid references public.teams(id) on delete cascade,
  created_by          uuid references auth.users(id) on delete set null,
  encryption_key_hash text,
  max_members         integer not null default 5,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  expires_at          timestamptz not null
);
alter table public.ghost_sessions enable row level security;
create index if not exists gs_team_active_idx on public.ghost_sessions (team_id) where is_active;

create table if not exists public.ghost_session_members (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.ghost_sessions(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  is_active  boolean not null default true,
  joined_at  timestamptz not null default now(),
  unique (session_id, user_id)
);
alter table public.ghost_session_members enable row level security;
create index if not exists gsm_session_idx on public.ghost_session_members (session_id);
create index if not exists gsm_user_idx on public.ghost_session_members (user_id);

create table if not exists public.ghost_messages (
  id               uuid primary key default gen_random_uuid(),
  ghost_session_id uuid not null references public.ghost_sessions(id) on delete cascade,
  sender_id        uuid references auth.users(id) on delete set null,
  content          text,
  integrity_hash   text,
  created_at       timestamptz not null default now()
);
alter table public.ghost_messages enable row level security;
create index if not exists gm_session_idx on public.ghost_messages (ghost_session_id, created_at);

-- ── SECURITY DEFINER membership helpers (non-recursive, fixed search_path) ──
create or replace function public.is_team_member(t_id uuid)
  returns boolean language sql security definer set search_path = public, pg_temp stable
as $$ select exists (select 1 from public.team_members
        where team_id = t_id and user_id = (select auth.uid())); $$;

create or replace function public.is_team_admin(t_id uuid)
  returns boolean language sql security definer set search_path = public, pg_temp stable
as $$ select exists (select 1 from public.team_members
        where team_id = t_id and user_id = (select auth.uid())
          and role in ('diamond_in_the_rough','team_lead')); $$;

create or replace function public.is_team_creator(t_id uuid)
  returns boolean language sql security definer set search_path = public, pg_temp stable
as $$ select exists (select 1 from public.teams
        where id = t_id and created_by = (select auth.uid())); $$;

create or replace function public.is_ghost_session_member(s_id uuid)
  returns boolean language sql security definer set search_path = public, pg_temp stable
as $$ select exists (select 1 from public.ghost_session_members
        where session_id = s_id and user_id = (select auth.uid()) and is_active); $$;

create or replace function public.is_ghost_session_creator(s_id uuid)
  returns boolean language sql security definer set search_path = public, pg_temp stable
as $$ select exists (select 1 from public.ghost_sessions
        where id = s_id and created_by = (select auth.uid())); $$;

-- ── RLS: teams ──────────────────────────────────────────────────────────────
create policy "teams_select_member" on public.teams
  for select to authenticated using (public.is_team_member(id) or created_by = (select auth.uid()));
create policy "teams_insert_self" on public.teams
  for insert to authenticated with check (created_by = (select auth.uid()));
create policy "teams_update_admin" on public.teams
  for update to authenticated using (public.is_team_admin(id)) with check (public.is_team_admin(id));
create policy "teams_delete_admin" on public.teams
  for delete to authenticated using (public.is_team_admin(id));

-- ── RLS: team_members ───────────────────────────────────────────────────────
-- INSERT: creator seeds self (is_team_creator) or an admin adds members.
-- Invite acceptance for a non-member goes through accept_team_invitation() RPC.
create policy "tm_select_member" on public.team_members
  for select to authenticated using (public.is_team_member(team_id));
-- Only the team CREATOR may write a 'diamond_in_the_rough' (owner) row (their own
-- seed); admins may add members only in NON-owner roles. Stops a team_lead from
-- minting additional owners.
create policy "tm_insert_creator_or_admin" on public.team_members
  for insert to authenticated
  with check (
    (public.is_team_creator(team_id) and role = 'diamond_in_the_rough')
    or (public.is_team_admin(team_id) and role <> 'diamond_in_the_rough')
  );
-- Admins manage members, but only the creator may touch or grant the owner role —
-- so a team_lead can't demote the owner or mint a new one.
create policy "tm_update_admin" on public.team_members
  for update to authenticated
  using (public.is_team_admin(team_id) and (role <> 'diamond_in_the_rough' or public.is_team_creator(team_id)))
  with check (public.is_team_admin(team_id) and (role <> 'diamond_in_the_rough' or public.is_team_creator(team_id)));
-- leave self, or admin removes a member
create policy "tm_delete_self_or_admin" on public.team_members
  for delete to authenticated using (user_id = (select auth.uid()) or public.is_team_admin(team_id));

-- ── RLS: team_invitations ───────────────────────────────────────────────────
-- Code-based lookup/acceptance for non-members goes through RPCs below (no
-- public SELECT). Team admins manage their team's invites directly.
create policy "ti_select_member" on public.team_invitations
  for select to authenticated using (public.is_team_member(team_id));
create policy "ti_insert_admin" on public.team_invitations
  for insert to authenticated with check (public.is_team_admin(team_id));
create policy "ti_update_admin" on public.team_invitations
  for update to authenticated using (public.is_team_admin(team_id)) with check (public.is_team_admin(team_id));
create policy "ti_delete_admin" on public.team_invitations
  for delete to authenticated using (public.is_team_admin(team_id));

-- ── RLS: user_settings (owner only, all ops) ────────────────────────────────
create policy "settings_owner_all" on public.user_settings
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ── RLS: statuses ───────────────────────────────────────────────────────────
-- Read active statuses (or your own, incl. expired, to manage). Owner writes.
-- NOTE: recording a view by a non-owner (append to views[]) needs a dedicated
-- SECURITY DEFINER RPC; deferred to the app-port (UPDATE here is owner-only).
create policy "status_select_active_or_own" on public.statuses
  for select to authenticated using (expires_at > now() or user_id = (select auth.uid()));
create policy "status_insert_own" on public.statuses
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "status_update_own" on public.statuses
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "status_delete_own" on public.statuses
  for delete to authenticated using (user_id = (select auth.uid()));

-- ── RLS: ghost_sessions ─────────────────────────────────────────────────────
create policy "gs_select_team_member" on public.ghost_sessions
  for select to authenticated using (public.is_team_member(team_id));
create policy "gs_insert_team_member" on public.ghost_sessions
  for insert to authenticated
  with check (created_by = (select auth.uid()) and public.is_team_member(team_id));
create policy "gs_update_creator" on public.ghost_sessions
  for update to authenticated using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));

-- ── RLS: ghost_session_members ──────────────────────────────────────────────
-- Creator seeds members; existing members add; you can leave your own row.
create policy "gsm_select_member" on public.ghost_session_members
  for select to authenticated
  using (public.is_ghost_session_member(session_id) or public.is_ghost_session_creator(session_id));
create policy "gsm_insert_creator_or_member" on public.ghost_session_members
  for insert to authenticated
  with check (public.is_ghost_session_creator(session_id) or public.is_ghost_session_member(session_id));
create policy "gsm_update_own" on public.ghost_session_members
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ── RLS: ghost_messages (session members only) ──────────────────────────────
create policy "gm_select_member" on public.ghost_messages
  for select to authenticated using (public.is_ghost_session_member(ghost_session_id));
create policy "gm_insert_member" on public.ghost_messages
  for insert to authenticated
  with check (sender_id = (select auth.uid()) and public.is_ghost_session_member(ghost_session_id));

-- ── RPCs: invite acceptance (the one flow plain RLS can't express safely) ────
-- A non-member can't SELECT/INSERT against a team they're not in, so code-based
-- invite lookup + acceptance run as SECURITY DEFINER with explicit validation.

create or replace function public.get_invitation_by_code(code text)
  returns table (team_id uuid, team_name text, role text, status text, expired boolean)
  language sql security definer set search_path = public, pg_temp stable
as $$
  select i.team_id, t.name, i.role, i.status, (i.expires_at <= now()) as expired
  from public.team_invitations i join public.teams t on t.id = i.team_id
  where i.invitation_code = code;
$$;

create or replace function public.accept_team_invitation(code text)
  returns uuid language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  me uuid := (select auth.uid());
  inv public.team_invitations%rowtype;
begin
  if me is null then raise exception 'not authenticated'; end if;

  select * into inv from public.team_invitations
    where invitation_code = code for update;
  if not found then raise exception 'invalid invitation'; end if;
  if inv.status <> 'pending' then raise exception 'invitation already used'; end if;
  if inv.expires_at <= now() then raise exception 'invitation expired'; end if;

  insert into public.team_members (team_id, user_id, role)
    values (inv.team_id, me, inv.role)
    on conflict (team_id, user_id) do nothing;

  update public.team_invitations
    set status = 'accepted', accepted_by = me, accepted_at = now()
    where id = inv.id;

  return inv.team_id;
end;
$$;

revoke all on function public.get_invitation_by_code(text) from public, anon;
revoke all on function public.accept_team_invitation(text) from public, anon;
grant execute on function public.get_invitation_by_code(text) to authenticated;
grant execute on function public.accept_team_invitation(text) to authenticated;
