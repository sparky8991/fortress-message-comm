-- Mirrors Firebase users into Supabase without creating a second auth system.
-- Identity: Firebase Auth remains the source of truth.
-- AuthZ: only the Netlify function uses a server-only Supabase key to write rows.
-- Browser clients should not receive direct anon/authenticated access to this table.

create table if not exists public.firebase_user_profiles (
  firebase_uid text primary key,
  email text,
  email_lower text,
  display_name text,
  display_name_lower text,
  call_sign text,
  call_sign_lower text,
  avatar_url text,
  firebase_provider text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_synced_at timestamptz not null default now()
);

alter table public.firebase_user_profiles enable row level security;

revoke all on table public.firebase_user_profiles from anon;
revoke all on table public.firebase_user_profiles from authenticated;

grant select, insert, update on table public.firebase_user_profiles to service_role;

create index if not exists firebase_user_profiles_email_lower_idx
  on public.firebase_user_profiles (email_lower);

create index if not exists firebase_user_profiles_call_sign_lower_idx
  on public.firebase_user_profiles (call_sign_lower);

comment on table public.firebase_user_profiles is
  'Server-side mirror of Firebase Auth/Firestore profiles. Firebase UID is the stable owner id for Supabase storage paths.';
