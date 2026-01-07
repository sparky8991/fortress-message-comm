# CLAUDE.md - AI Assistant Guide for Fortress Message Comm

## Project Overview

Fortress Message Comm is a secure team messaging application built with React, TypeScript, and Supabase. It features encrypted messaging, team collaboration, ghost mode sessions, and mobile support via Capacitor.

**Lovable Project URL:** https://lovable.dev/projects/3262fb28-8730-4647-8a23-3e6a2d67e697

## Quick Reference

```bash
npm install        # Install dependencies
npm run dev        # Start dev server (localhost:8080)
npm run build      # Production build
npm run lint       # Run ESLint
npm run preview    # Preview production build
```

## Technology Stack

| Category | Technology |
|----------|------------|
| Frontend | React 18.3, TypeScript 5.5, Vite 5.4 |
| UI | shadcn/ui, Radix UI, Tailwind CSS 3.4 |
| Backend | Supabase (PostgreSQL + Auth + Realtime) |
| State | TanStack React Query, React Hook Form, Zod |
| Mobile | Capacitor 7.3 |
| Icons | Lucide React |

## Project Structure

```
src/
├── components/           # React components
│   ├── ui/              # shadcn/ui base components (50+)
│   ├── ChatArea.tsx     # Main messaging interface
│   ├── Sidebar.tsx      # Navigation and chat/team lists
│   ├── MessageList.tsx  # Real-time message rendering
│   ├── MessageInput.tsx # Message composition
│   ├── TeamList.tsx     # Team management
│   ├── GhostSessionManager.tsx  # Encrypted sessions
│   └── ...
├── pages/               # Route pages
│   ├── Index.tsx        # Main chat interface (/)
│   ├── Auth.tsx         # Login/signup (/auth)
│   ├── ProfileSettings.tsx  # User settings (/profile-settings)
│   └── InvitePage.tsx   # Team invitations (/invite/:code)
├── hooks/               # Custom React hooks
│   ├── useDirectMessages.ts  # Conversations & messaging
│   ├── useChatMessages.ts    # Team chat with file uploads
│   ├── useUserSettings.ts    # User preferences
│   └── usePasswordGenerator.ts  # Secure password gen
├── services/            # Business logic
│   ├── conversationService.ts  # DM operations
│   └── userSettingsService.ts  # Settings CRUD
├── integrations/
│   └── supabase/        # Supabase client & types
├── utils/
│   └── imageEncryption.ts  # AES-GCM encryption
└── lib/
    └── utils.ts         # Tailwind class utilities

supabase/
├── migrations/          # 15 SQL migrations
└── functions/           # Edge functions (send-invitation)
```

## Development Guidelines

### Code Style & Conventions

- **Components:** PascalCase (e.g., `ChatArea.tsx`, `MessageInput.tsx`)
- **Hooks:** camelCase with `use` prefix (e.g., `useDirectMessages`, `useUserSettings`)
- **Services:** camelCase with descriptive names (e.g., `conversationService`)
- **TypeScript:** Relaxed mode (`strict: false`) - implicit any is allowed
- **Imports:** Use `@/` path alias for `src/` directory

### Component Patterns

```tsx
// Standard component structure
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const MyComponent = ({ prop }: { prop: string }) => {
  // hooks first, then handlers, then render
  return <div>...</div>;
};
```

### UI Components

Use shadcn/ui components from `@/components/ui/`:
- Dialog, Sheet, Drawer for modals
- Button, Input, Textarea for forms
- Card, Tabs, Accordion for layout
- Toast (via Sonner) for notifications
- ScrollArea for scrollable content

### Supabase Patterns

```tsx
// Querying data
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('column', value);

// Real-time subscriptions
supabase
  .channel('channel-name')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'table_name' }, callback)
  .subscribe();

// Always clean up subscriptions
return () => supabase.removeChannel(channel);
```

### React Query Usage

```tsx
const { data, isLoading, error } = useQuery({
  queryKey: ['key', dependency],
  queryFn: async () => { /* fetch logic */ },
  enabled: !!dependency,
});
```

## Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (username, call_sign, avatar, bio) |
| `teams` | Team entities with creator |
| `team_members` | Team membership with roles |
| `team_invitations` | Email invitations (7-day expiry) |
| `conversations` | Direct & group chats |
| `conversation_participants` | Chat membership |
| `direct_messages` | Messages with encryption flags |
| `ghost_sessions` | Temporary encrypted sessions |
| `ghost_messages` | Double-encrypted messages |
| `user_settings` | User preferences (JSONB) |

### Team Roles (Hierarchy)

1. `diamond_in_the_rough` - Creator/owner (highest)
2. `team_lead` - Can invite members
3. `team_organizer` - Team management
4. `team_user` - Basic member

### Important Database Functions

- `accept_team_invitation(code)` - Join team via invite
- `create_ghost_session(team_id, name, key)` - Create encrypted session
- `find_or_create_direct_conversation(user_id)` - Init DM
- `search_users(term)` - Search by username/name/number

## Security Patterns

### Row Level Security (RLS)

All tables have RLS enabled. Users can only access:
- Their own profile and settings
- Teams they belong to
- Conversations they participate in
- Messages in their conversations

### Encryption

- **Image Encryption:** AES-GCM with PBKDF2 key derivation (256-bit keys, 100k iterations)
- **Ghost Mode:** Double-encrypted with message integrity hashing
- **Messages:** Encryption flag marks encrypted content

### Authentication

- Supabase Auth with email/password
- JWT tokens in session storage
- Min 6 character passwords

## File Upload Pattern

```tsx
// Upload to Supabase Storage
const { data, error } = await supabase.storage
  .from('chat_attachments')
  .upload(filePath, file);

// Get signed URL (7-day expiry)
const { data: urlData } = await supabase.storage
  .from('chat_attachments')
  .createSignedUrl(filePath, 604800);
```

## Routes

| Path | Component | Purpose |
|------|-----------|---------|
| `/` | Index | Main chat interface |
| `/auth` | Auth | Login/signup |
| `/profile-settings` | ProfileSettings | User settings |
| `/invite/:inviteCode` | InvitePage | Accept team invite |
| `*` | NotFound | 404 page |

## Common Tasks

### Adding a New Component

1. Create file in `src/components/` with PascalCase name
2. Import UI components from `@/components/ui/`
3. Use Supabase client from `@/integrations/supabase/client`
4. Follow existing patterns for hooks and state

### Adding a Database Table

1. Create migration in `supabase/migrations/`
2. Enable RLS: `ALTER TABLE tablename ENABLE ROW LEVEL SECURITY;`
3. Add appropriate policies
4. Update types in `src/integrations/supabase/types.ts`

### Adding a Hook

1. Create file in `src/hooks/` with `use` prefix
2. Handle loading/error states
3. Set up real-time subscriptions if needed
4. Clean up subscriptions on unmount

### Adding an Edge Function

1. Create function in `supabase/functions/`
2. Require authentication via Bearer token
3. Use Deno runtime

## Important Notes

- **Dev Server Port:** 8080 (configured in vite.config.ts)
- **Path Alias:** `@/` maps to `src/`
- **Dark Theme:** Default theme, dark-mode first design
- **Mobile:** Capacitor configured for iOS/Android
- **Lovable Integration:** componentTagger enabled in dev mode

## Error Handling

- Use toast notifications (Sonner) for user feedback
- Log errors to console for debugging
- Check RLS policies if queries return empty unexpectedly
- Verify user authentication state before protected operations

## Testing

No test framework currently configured. Verify changes by:
1. Running `npm run lint` for code quality
2. Running `npm run build` to check for compilation errors
3. Manual testing in dev server

## Environment

- **Supabase Project:** `yuccssovpcxaoyemepth`
- **Supabase URL:** `https://yuccssovpcxaoyemepth.supabase.co`
- **Storage Bucket:** `chat_attachments` (private, 25MB limit)
