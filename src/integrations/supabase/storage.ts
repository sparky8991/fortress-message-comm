import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const CHAT_ATTACHMENTS_BUCKET = 'chat-attachments';
export const MAX_CHAT_ATTACHMENT_BYTES = 25 * 1024 * 1024;

const BLOCKED_EXTENSIONS = new Set([
  'bat',
  'cmd',
  'css',
  'exe',
  'html',
  'js',
  'jsx',
  'msi',
  'php',
  'ps1',
  'sh',
  'svg',
  'ts',
  'tsx',
  'vbs',
]);

const BLOCKED_MIME_TYPES = new Set([
  'application/javascript',
  'application/x-msdownload',
  'image/svg+xml',
  'text/css',
  'text/html',
  'text/javascript',
]);

let storageClient: SupabaseClient | null = null;

const getStorageClient = () => {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('Supabase Storage is not configured.');
  }

  if (!storageClient) {
    storageClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  return storageClient;
};

const sanitizePathSegment = (segment: string) =>
  segment.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_').slice(0, 120) || 'file';

const getSafeExtension = (fileName: string) => {
  const safeName = sanitizePathSegment(fileName);
  const extension = safeName.includes('.') ? safeName.split('.').pop()?.toLowerCase() : 'bin';

  if (!extension || BLOCKED_EXTENSIONS.has(extension)) {
    throw new Error('This file type is not allowed.');
  }

  return extension;
};

const validateChatAttachment = (file: File) => {
  if (file.size > MAX_CHAT_ATTACHMENT_BYTES) {
    throw new Error('File exceeds the 25MB attachment limit.');
  }

  if (file.type && BLOCKED_MIME_TYPES.has(file.type.toLowerCase())) {
    throw new Error('This file type is not allowed.');
  }
};

export const uploadChatAttachment = async ({
  userId,
  conversationId,
  file,
}: {
  userId: string;
  conversationId: string;
  file: File;
}) => {
  const client = getStorageClient();
  validateChatAttachment(file);
  const extension = getSafeExtension(file.name);
  const objectPath = [
    sanitizePathSegment(userId),
    sanitizePathSegment(conversationId),
    `${Date.now()}-${crypto.randomUUID()}.${extension}`,
  ].join('/');

  const { error } = await client.storage
    .from(CHAT_ATTACHMENTS_BUCKET)
    .upload(objectPath, file, {
      cacheControl: '3600',
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  const { data } = client.storage.from(CHAT_ATTACHMENTS_BUCKET).getPublicUrl(objectPath);

  if (!data.publicUrl) {
    throw new Error('Supabase upload succeeded, but no public URL was returned.');
  }

  return {
    path: objectPath,
    publicUrl: data.publicUrl,
  };
};
