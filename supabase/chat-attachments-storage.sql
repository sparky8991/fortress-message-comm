-- Supabase Storage setup for SecureChat direct-message attachments.
-- Files are stored under:
-- chat-attachments/users/{firebaseUid}/conversations/{conversationId}/{timestamp}-{uuid}.{extension}
--
-- SECURITY NOTES:
-- * The bucket is PUBLIC — anyone with a file's URL can open it. Encrypted
--   payloads (.enc) stay safe because the bytes are encrypted client-side
--   before upload. Plain documents/images are NOT private; treat the bucket as
--   "anyone with the link". (Future hardening: private bucket + signed URLs +
--   real per-user auth — tracked as the attachment-encryption phase.)
-- * Inline-executable / scriptable types (html, svg, js, jsx, ts, css, exe,
--   msi, bat, cmd, sh, ps1, vbs, php) are intentionally NOT allowed in either
--   the MIME allow-list or the extension allow-list, so a public URL can never
--   serve attacker-supplied script. This mirrors the app's own upload guards.
-- * audio/* and video/* are allowed by wildcard (inert media, no script
--   subtypes); images and documents are listed explicitly (image/* is avoided
--   on purpose because it would include image/svg+xml).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-attachments',
  'chat-attachments',
  true,
  26214400,
  array[
    -- images (NOT image/* — that would include svg)
    'image/gif',
    'image/jpeg',
    'image/png',
    'image/webp',
    -- encrypted payloads (.enc) + generic binary
    'application/octet-stream',
    -- documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    -- archives
    'application/zip',
    -- voice + shared media (inert; wildcards keep browser MIME variance working)
    'audio/*',
    'video/*'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Replace the old image-only policy with one that also allows documents + media.
drop policy if exists "Allow image uploads to chat attachment user folders" on storage.objects;
drop policy if exists "Allow attachment uploads to chat attachment user folders" on storage.objects;

create policy "Allow attachment uploads to chat attachment user folders"
on storage.objects
for insert
to anon
with check (
  bucket_id = 'chat-attachments'
  and (storage.foldername(name))[1] = 'users'
  and (storage.foldername(name))[2] is not null
  and (storage.foldername(name))[3] = 'conversations'
  and (storage.foldername(name))[4] is not null
  and lower(storage.extension(name)) in (
    -- encrypted payloads
    'enc',
    -- images
    'gif', 'jpeg', 'jpg', 'png', 'webp',
    -- documents
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv',
    -- archives
    'zip',
    -- voice + shared media
    'webm', 'mp3', 'm4a', 'wav', 'ogg', 'mp4', 'mov'
  )
);
