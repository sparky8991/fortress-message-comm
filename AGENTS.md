# AGENTS.md - AI Assistant Guide for SecureChat

## Project Overview

SecureChat (Fortress Message Comm) is a secure team messaging application built with React, TypeScript, and Firebase. It features encrypted messaging, team collaboration, ghost mode sessions, and mobile support via Capacitor.

**Built By:** Johnathan Carlson
**Live URL:** https://fortress-message-comm.netlify.app

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
| Backend | Firebase (Firestore + Auth + Storage) |
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
│   └── firebase/        # Firebase app, auth, Firestore, and Storage clients
├── utils/
│   └── imageEncryption.ts  # AES-GCM encryption
└── lib/
    └── utils.ts         # Tailwind class utilities

archive/
└── supabase-legacy-2026-06-12.zip  # Archived Supabase migration/function history
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
import { auth, db, storage } from "@/integrations/firebase/client";

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

### Firebase Patterns

```tsx
// Querying Firestore data
const snap = await getDoc(doc(db, 'profiles', userId));

// Real-time subscriptions
const unsubscribe = onSnapshot(
  query(collection(db, 'direct_messages'), where('conversation_id', '==', conversationId)),
  (snapshot) => { /* handle docs */ }
);

// Always clean up subscriptions
return () => unsubscribe();
```

### React Query Usage

```tsx
const { data, isLoading, error } = useQuery({
  queryKey: ['key', dependency],
  queryFn: async () => { /* fetch logic */ },
  enabled: !!dependency,
});
```

## Firestore Collections

### Core Collections

| Collection | Purpose |
|-------|---------|
| `profiles` | User profiles (call sign, name, avatar, bio, search fields) |
| `teams` | Team entities with creator |
| `team_members` | Team membership with roles |
| `team_invitations` | Email invitations (7-day expiry) |
| `conversations` | Direct & group chats |
| `conversation_participants` | Chat membership |
| `direct_messages` | Messages with encryption flags |
| `ghost_sessions` | Temporary encrypted sessions |
| `ghost_messages` | Double-encrypted messages |
| `user_settings` | User preferences and security settings |
| `statuses` | 24-hour text/image status updates |

### Team Roles (Hierarchy)

1. `diamond_in_the_rough` - Creator/owner (highest)
2. `team_lead` - Can invite members
3. `team_organizer` - Team management
4. `team_user` - Basic member

### Important Services

- `conversationService.findOrCreateDirectConversation(userId)` - Init DM
- `conversationService.sendMessage(...)` - Send encrypted direct messages
- `statusService.createTextStatus(...)` - Create 24-hour text status
- `statusService.createImageStatus(...)` - Create 24-hour image status
- `userSettingsService` - Store notification and security preferences

## Security Patterns

### Firestore Security

Firestore security rules should keep users limited to:
- Their own profile and settings
- Teams they belong to
- Conversations they participate in
- Messages in their conversations

### Encryption

- **Image Encryption:** AES-GCM with PBKDF2 key derivation (256-bit keys, 100k iterations)
- **Ghost Mode:** Double-encrypted with message integrity hashing
- **Messages:** Encryption flag marks encrypted content

### Authentication

- Firebase Auth with email/password and Google sign-in
- Firebase-managed user sessions
- Min 6 character passwords

## File Upload Pattern

```tsx
// Upload to Firebase Storage
const storageRef = ref(storage, filePath);
await uploadBytes(storageRef, file);

// Get download URL
const downloadUrl = await getDownloadURL(storageRef);
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
3. Use Firebase clients from `@/integrations/firebase/client`
4. Follow existing patterns for hooks and state

### Adding a Firestore Collection

1. Define the collection shape near the service/hook that owns it
2. Add Firestore reads/writes through `db` from `@/integrations/firebase/client`
3. Add or update Firestore security rules outside this repo as needed
4. Avoid queries that require composite indexes unless the index is planned

### Adding a Hook

1. Create file in `src/hooks/` with `use` prefix
2. Handle loading/error states
3. Set up real-time subscriptions if needed
4. Clean up subscriptions on unmount

### Adding a Firebase-backed Feature

1. Keep Firestore/Storage calls in hooks or services, not deeply nested UI
2. Check `auth.currentUser` before protected operations
3. Clean up `onSnapshot` subscriptions on unmount

## Important Notes

- **Dev Server Port:** 8080 (configured in vite.config.ts)
- **Path Alias:** `@/` maps to `src/`
- **Dark Theme:** Default theme, dark-mode first design
- **Mobile:** Capacitor configured for iOS/Android
- **Lovable Integration:** componentTagger enabled in dev mode

## Error Handling

- Use toast notifications (Sonner) for user feedback
- Log errors to console for debugging
- Check Firebase Auth state, Firestore rules, and missing indexes if queries fail or return empty unexpectedly
- Verify user authentication state before protected operations

## Testing

No test framework currently configured. Verify changes by:
1. Running `npm run lint` for code quality
2. Running `npm run build` to check for compilation errors
3. Manual testing in dev server

## Environment

- **Firebase Project:** `fortress-message-comm`
- **Firebase Auth Domain:** `fortress-message-comm.firebaseapp.com`
- **Storage Bucket:** `fortress-message-comm.firebasestorage.app`
- **Legacy Supabase Archive:** `archive/supabase-legacy-2026-06-12.zip`
