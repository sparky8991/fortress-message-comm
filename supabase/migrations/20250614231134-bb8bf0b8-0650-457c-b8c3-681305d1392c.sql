
-- Create a storage bucket for chat attachments if it doesn't exist.
-- It's set to private (public = false) with a 25MB file size limit.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('chat_attachments', 'chat_attachments', false, 26214400, NULL)
ON CONFLICT (id) DO UPDATE SET file_size_limit = 26214400;

-- RLS Policies for the 'chat_attachments' bucket.

-- Drop existing policies to avoid conflicts if they are re-run
DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own attachments" ON storage.objects;

-- Allow authenticated users to upload files.
CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat_attachments');

-- Allow any authenticated user to view any attachment.
-- WARNING: This is secure as long as file paths are not guessable.
-- For a production app with group chats, a more advanced policy
-- checking chat membership would be recommended.
CREATE POLICY "Authenticated users can view attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'chat_attachments');

-- Allow users to update only their own files.
CREATE POLICY "Users can update their own attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (auth.uid() = owner);

-- Allow users to delete only their own files.
CREATE POLICY "Users can delete their own attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (auth.uid() = owner);
