-- Supabase Storage setup for SecureChat direct-message attachments.
-- Files are stored under:
-- chat-attachments/users/{firebaseUid}/conversations/{conversationId}/{timestamp}-{uuid}.{extension}

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-attachments',
  'chat-attachments',
  true,
  26214400,
  array[
    'image/gif',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/octet-stream'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Allow image uploads to chat attachment user folders" on storage.objects;

create policy "Allow image uploads to chat attachment user folders"
on storage.objects
for insert
to anon
with check (
  bucket_id = 'chat-attachments'
  and (storage.foldername(name))[1] = 'users'
  and (storage.foldername(name))[2] is not null
  and (storage.foldername(name))[3] = 'conversations'
  and (storage.foldername(name))[4] is not null
  and lower(storage.extension(name)) in ('enc', 'gif', 'jpeg', 'jpg', 'png', 'webp')
);
