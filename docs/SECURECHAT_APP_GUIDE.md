# SecureChat App Guide

This document is the working runbook for SecureChat / Fortress Message Comm. It explains what the app does, which systems it uses, how deploys work, how images and encrypted media are stored, and where to look when something breaks.

Built by Johnathan Carlson. Live site: https://fortress-message-comm.netlify.app

## Quick Start

```bash
cd "H:\Projects\Fortress Message Comm"
npm install
npm run dev
npm run lint
npm run build
```

The local Vite server runs on port `8080` from `vite.config.ts`.

## Deployment Flow

Normal production flow:

1. Make changes locally in `H:\Projects\Fortress Message Comm`.
2. Run local checks:

   ```bash
   npm run lint
   npm run build
   ```

3. Commit and push to GitHub:

   ```bash
   git status
   git add .
   git commit -m "Describe the change"
   git push origin main
   ```

4. Netlify builds from GitHub `main` and publishes the new version.
5. Verify the live site at https://fortress-message-comm.netlify.app.

Netlify is configured in `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

The redirect rule is required because this is a React single-page app. Without it, direct links such as `/auth`, `/profile-settings`, and `/invite/:inviteCode` can 404 on refresh.

## Required Environment Variables

Set client-side variables in Netlify under Project configuration > Environment variables. Any variable beginning with `VITE_` is bundled into the browser build, so never put server-only secrets behind `VITE_`.

| Variable | Where used | Public or secret | Purpose |
| --- | --- | --- | --- |
| `VITE_FIREBASE_API_KEY` | `src/integrations/firebase/client.ts` | Public client config | Required for Firebase Auth, Firestore, and Firebase Storage client setup. App will fail early if missing. |
| `VITE_SUPABASE_URL` | `src/integrations/supabase/storage.ts` | Public client config | Supabase project URL for chat attachment uploads. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `src/integrations/supabase/storage.ts` | Public client config | Supabase publishable key used by the browser storage client. |
| `VITE_TENOR_API_KEY` | `src/components/GifPicker.tsx` | Public API key | Enables Tenor GIF search and featured GIFs. |
| `SUPABASE_URL` | `netlify/functions/sync-firebase-user.ts` | Server env | Supabase URL for the Netlify user sync function. |
| `SUPABASE_SERVER_KEY` | `netlify/functions/sync-firebase-user.ts` | Secret | Server-only Supabase key that can write the Firebase user mirror table. Do not expose as `VITE_`. |
| `FIREBASE_WEB_API_KEY` | `netlify/functions/sync-firebase-user.ts` | Server env | Used by the Netlify function to verify Firebase ID tokens through Google Identity Toolkit. |
| `FIREBASE_PROJECT_ID` | `netlify/functions/sync-firebase-user.ts` | Server env | Firebase project id. Defaults to `fortress-message-comm` if missing. |
| `RAFTER_API_KEY` | Security tooling | Secret/local or CI | Optional Rafter security scan key. |

Important current gap: `.env.example` lists Supabase, Tenor, and Rafter, but it does not currently list `VITE_FIREBASE_API_KEY`. If local setup fails with `Missing VITE_FIREBASE_API_KEY environment variable`, add that variable to local `.env`.

## Main Systems

| System | Current role | Key files |
| --- | --- | --- |
| React + Vite | Browser app, routing, UI, PWA shell | `src/App.tsx`, `src/pages`, `src/components`, `vite.config.ts` |
| Firebase Auth | Primary account system | `src/integrations/firebase/client.ts`, `src/pages/Auth.tsx` |
| Firestore | Primary app data: profiles, conversations, messages, settings, statuses, teams, calls | `firestore.rules`, `src/services/conversationService.ts`, `src/services/userSettingsService.ts`, `src/services/statusService.ts` |
| Firebase Storage | Profile avatars and status images | `src/pages/ProfileSettings.tsx`, `src/services/statusService.ts` |
| Supabase Storage | Direct-message chat attachments and encrypted payload files | `src/integrations/supabase/storage.ts`, `supabase/chat-attachments-storage.sql` |
| Supabase Postgres | Server-side mirror of Firebase users | `supabase/firebase-user-profiles.sql`, `netlify/functions/sync-firebase-user.ts` |
| Netlify | Static hosting and serverless function hosting | `netlify.toml`, `netlify/functions/sync-firebase-user.ts` |
| Tailwind + shadcn/ui | Styling and base UI primitives | `src/index.css`, `src/components/ui` |
| Fortress tactical UI tokens | Colors, version, classification marks, theme options | `src/lib/fortress.ts`, `src/components/tactical` |

## App Routes

Routes are defined in `src/App.tsx`.

| Route | Page | Purpose |
| --- | --- | --- |
| `/auth` | `src/pages/Auth.tsx` | Landing page plus login/signup dialog. |
| `/setup-callsign` | `src/pages/CallSignSetup.tsx` | Required call sign setup after login if profile has no call sign. |
| `/profile-settings` | `src/pages/ProfileSettings.tsx` | Full profile editor, avatar upload, call sign, password change. |
| `/invite/:inviteCode` | `src/pages/InvitePage.tsx` | Team invite acceptance flow. |
| `/` | `src/pages/Index.tsx` | Main SecureChat app. |
| `*` | `src/pages/NotFound.tsx` | 404 fallback. |

## Login And User Setup

Firebase Auth is the source of truth for user accounts.

Primary files:

- `src/pages/Auth.tsx` - login, signup, Google sign-in, landing page copy.
- `src/pages/CallSignSetup.tsx` - required call sign setup.
- `src/pages/ProfileSettings.tsx` - profile edit, avatar, password update.
- `src/integrations/firebase/client.ts` - Firebase app, Auth, Firestore, Storage, Google provider.
- `netlify/functions/sync-firebase-user.ts` - syncs Firebase user/profile data into Supabase after login.
- `supabase/firebase-user-profiles.sql` - creates the Supabase mirror table.

Login flow:

1. User signs in through Firebase.
2. `src/pages/Index.tsx` checks Firebase auth state.
3. The app reads `profiles/{uid}` from Firestore.
4. If there is no profile or no `callSign`, the user is sent to `/setup-callsign`.
5. If profile exists, `syncFirebaseUserToSupabase(currentUser)` runs in the background.

The Supabase mirror table is not a second login system. It exists so Supabase can track Firebase users and so storage paths can stay tied to Firebase UID ownership.

## Firestore Collections

Firestore rules are in `firestore.rules`. Firebase project selection is in `.firebaserc`, and `firebase.json` currently deploys Firestore rules only.

Common collections:

| Collection | Purpose | Main code |
| --- | --- | --- |
| `profiles` | User profile, call sign, avatar URL, names, visibility | `Auth.tsx`, `CallSignSetup.tsx`, `ProfileSettings.tsx`, `Sidebar.tsx` |
| `user_settings` | Notification, security, call, chat, and theme settings | `userSettingsService.ts`, `useUserSettings.ts`, `SettingsDialog.tsx` |
| `conversations` | Direct/group conversation records | `conversationService.ts`, `useDirectMessages.ts` |
| `conversation_participants` | User membership in conversations | `conversationService.ts`, `useDirectMessages.ts` |
| `direct_messages` | Persisted direct messages and metadata | `conversationService.ts`, `useDirectMessages.ts`, `MessageList.tsx` |
| `statuses` | 24-hour text/image status updates | `statusService.ts`, `StatusBar.tsx`, `StatusCreator.tsx`, `StatusViewer.tsx` |
| `teams`, `team_members`, `team_invitations` | Team data and invites | `TeamList.tsx`, `CreateTeamDialog.tsx`, `InvitePage.tsx` |
| `calls` | Call signaling state | `VoiceVideoCall.tsx` |
| `broadcast_channels`, `broadcast_subscriptions`, `broadcast_messages` | Broadcast channel feature | `BroadcastChannels.tsx` |
| `ghost_sessions`, `ghost_session_members` | Ghost session feature | `GhostSessionManager.tsx` |
| `burner_identities` | Burner identity feature | `BurnerIdentities.tsx` |
| `vault_files` | Encrypted file vault feature | `EncryptedFileVault.tsx` |
| `dead_man_switches`, `user_activity` | Dead man's switch feature | `DeadManSwitch.tsx` |
| `typing_indicators` | Typing indicators | Firestore rules and chat components |
| `screenshot_logs` | Screenshot/security events | Security components |

If Firestore reads return empty unexpectedly, check these first:

1. Is the user logged in?
2. Does the document use the current Firebase UID?
3. Is the rule in `firestore.rules` allowing the read/write?
4. Is the query expecting a field name with snake_case or camelCase?
5. Does the feature use direct-message Firestore state, or older local state?

## Image And File Storage

There are two storage systems. This is intentional.

### 1. Direct-message attachments: Supabase Storage

Used for chat attachments, normal images, GIF/file uploads, voice uploads, and encrypted `.enc` payload files.

Key files:

- `src/integrations/supabase/storage.ts`
- `supabase/chat-attachments-storage.sql`
- `src/hooks/useDirectMessages.ts`
- `src/hooks/useChatMessages.ts`
- `src/components/MessageInput.tsx`
- `src/components/AttachmentPreview.tsx`
- `src/components/EncryptedImageUpload.tsx`
- `src/components/EncryptedImageViewer.tsx`

Bucket:

```text
chat-attachments
```

Object path format:

```text
users/{firebaseUid}/conversations/{conversationId}/{timestamp}-{uuid}.{extension}
```

Example:

```text
users/VkXs.../conversations/abc123/1718235123123-dce7f5f8-....webp
```

Rules and limits:

- Max file size is 25 MB.
- The bucket is configured as public in `supabase/chat-attachments-storage.sql`.
- Uploads are allowed under `users/{firebaseUid}/conversations/{conversationId}/...`.
- Allowed storage extensions are `enc`, `gif`, `jpeg`, `jpg`, `png`, `webp`.
- Client-side blocked extensions include executable/script/web files such as `exe`, `js`, `ts`, `tsx`, `html`, `svg`, `ps1`, `sh`, and others.

If an attachment can be selected but will not send, check:

1. Netlify has `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
2. Supabase has the `chat-attachments` bucket.
3. The SQL from `supabase/chat-attachments-storage.sql` was run in the active Supabase project.
4. The file is under 25 MB.
5. The extension is allowed by both the browser validator and Supabase policy.
6. The browser console shows the actual Supabase upload error.

### 2. Profile avatars and status images: Firebase Storage

Used for:

- Profile avatar uploads in `src/pages/ProfileSettings.tsx`.
- Image statuses in `src/services/statusService.ts`.

Profile avatar path:

```text
avatars/{firebaseUid}/profile.{extension}
```

Status image path:

```text
statuses/{firebaseUid}/{timestamp}_{originalFileName}
```

Profile avatar rules:

- Must be an image MIME type.
- Max size is 5 MB.
- The resulting Firebase Storage download URL is stored in `profiles/{uid}.avatarUrl`.
- Visibility is controlled by `profiles/{uid}.showAvatar`.

Status image rules:

- Uploaded to Firebase Storage.
- Status record is stored in Firestore `statuses`.
- Statuses expire after 24 hours based on `expires_at`.

Important: this repo currently includes `firestore.rules`, but no `storage.rules` file is tracked. If Firebase Storage uploads fail, check the Firebase Console Storage rules for `avatars/...` and `statuses/...`.

### 3. GIFs

GIF search uses Tenor.

Key file:

- `src/components/GifPicker.tsx`

Requirements:

- `VITE_TENOR_API_KEY` must be set.
- If missing, the picker opens but shows `Tenor key not configured`.
- Sending a GIF sends the remote GIF URL as text. It does not upload the GIF to Supabase.

## Encrypted Payload Flow

Encrypted media is handled client-side with Web Crypto.

Key files:

- `src/components/EncryptedImageUpload.tsx`
- `src/components/EncryptedImageViewer.tsx`
- `src/utils/imageEncryption.ts`
- `src/utils/encryptedPayloadMessage.ts`
- `src/components/MessageInput.tsx`
- `src/components/AttachmentPreview.tsx`
- `src/hooks/useDirectMessages.ts`

Encryption details:

- Algorithm: AES-GCM.
- Key derivation: PBKDF2 with SHA-256.
- Iterations: 100,000.
- Salt: 16 bytes.
- IV: 12 bytes.
- Key size: 256-bit.

Send flow:

1. User clicks the locked/secret payload option in the composer.
2. `EncryptedImageUpload` asks for/selects the image.
3. `ImageEncryption.encryptImage()` encrypts the file in the browser.
4. The encrypted blob is wrapped as `encrypted_{originalName}.enc`.
5. Metadata includes salt, IV, original name, MIME type, and a temporary `shareCode`.
6. `MessageInput` displays/copies the decryption key for the sender.
7. Before storing message metadata, `stripEncryptedPayloadSecrets()` removes `shareCode`.
8. The `.enc` file uploads to Supabase Storage.
9. Firestore `direct_messages` stores the attachment URL and safe metadata.
10. The receiver enters the key in `EncryptedImageViewer` to decrypt locally in the browser.

Security note:

- The decryption key is not supposed to be stored in Firestore.
- Share the key through a separate channel.
- If a receiver cannot decrypt, confirm the sender copied the key before leaving the screen.

## Messaging Features

### Direct messages

Primary files:

- `src/hooks/useDirectMessages.ts`
- `src/services/conversationService.ts`
- `src/components/ChatArea.tsx`
- `src/components/MessageList.tsx`
- `src/components/MessageInput.tsx`
- `src/components/ContactList.tsx`

Direct messages are persisted in Firestore:

- Conversation docs are in `conversations`.
- Participants are in `conversation_participants`.
- Messages are in `direct_messages`.
- Realtime updates use Firestore `onSnapshot`.

Message types:

- `text`
- `image`
- `file`
- `voice`
- `system`

All direct-message sends mark `encrypted: true` in Firestore. The UI labels the channel as protected/encrypted.

### User search and starting conversations

Primary files:

- `src/components/UserSearchDialog.tsx`
- `src/services/conversationService.ts`
- `src/hooks/useDirectMessages.ts`

Search starts a direct conversation by finding or creating a `conversations` document and two `conversation_participants` documents.

If users cannot find each other:

1. Check each user has a `profiles/{uid}` document.
2. Check each user has a call sign.
3. Check Firestore rules allow signed-in reads for profiles.
4. Check the search code for exact field names.

### Burn after read

Primary files:

- `src/utils/burnAfterRead.js`
- `src/components/BurnAfterReadMessage.tsx`
- `src/components/tactical/ComposerModeBar.tsx`
- `src/components/MessageInput.tsx`

Current default burn time:

```text
120 seconds
```

Flow:

1. Sender toggles burn mode in the composer.
2. Message metadata gets `burnAfterRead: true` and `burnAfterReadSeconds`.
3. Recipient sees a covered message until opening it.
4. Opening writes `burnOpenedAt`, `burnExpiresAt`, and `burnOpenedBy`.
5. Once expired, the client deletes the Firestore `direct_messages/{id}` document.

Troubleshooting:

- If burn messages do not delete, check the recipient kept the app open long enough for the client-side deletion effect to run.
- Firestore rules allow delete for expired burn messages through `isExpiredBurnAfterReadMessage()`.
- There is no server-side scheduled cleanup for burn messages in the current repo.

### Voice messages

Primary files:

- `src/components/VoiceRecorder.tsx`
- `src/components/VoiceMessagePlayer.tsx`
- `src/components/MessageInput.tsx`
- `src/hooks/useDirectMessages.ts`

Flow:

1. Browser records audio as a `webm` file.
2. File uploads through Supabase Storage.
3. Firestore message is sent with `message_type: voice`.
4. Metadata includes voice duration and MIME type.
5. `VoiceMessagePlayer` renders playback.

### Reactions, replies, and message menu

Primary files:

- `src/components/MessageList.tsx`
- `src/components/MessageContextMenu.tsx`
- `src/components/EmojiPicker.tsx`

These are UI-level message interaction features. If a reaction or reply does not persist, inspect whether that action is wired into Firestore for direct messages or only local UI state.

### Status updates

Primary files:

- `src/services/statusService.ts`
- `src/components/StatusBar.tsx`
- `src/components/StatusCreator.tsx`
- `src/components/StatusViewer.tsx`
- `src/components/StatusUpdates.tsx`

Status behavior:

- Text and image statuses are stored in Firestore `statuses`.
- Image status media uploads to Firebase Storage.
- Statuses expire after 24 hours.
- Views are tracked in the `views` array.

### Teams

Primary files:

- `src/components/TeamList.tsx`
- `src/components/CreateTeamDialog.tsx`
- `src/pages/InvitePage.tsx`
- `src/components/TeamChat.tsx`
- `src/components/TeamView.tsx`

Firestore collections:

- `teams`
- `team_members`
- `team_invitations`

Team roles listed in the older project notes:

1. `diamond_in_the_rough`
2. `team_lead`
3. `team_organizer`
4. `team_user`

Troubleshooting:

- Check team membership in `team_members`.
- Check invite records in `team_invitations`.
- Check whether the screen uses persistent Firestore data or local/demo state.

### Calls

There are two call-related components:

- `src/components/CallInterface.tsx` - current full-screen call UI used from `Index.tsx` through `ChatHeader`.
- `src/components/VoiceVideoCall.tsx` - Firestore `calls` signaling plus browser media permissions.

If call buttons open UI but do not connect real audio/video between users, verify which component is currently mounted by the active flow. `CallInterface.tsx` is a UI/timer experience; `VoiceVideoCall.tsx` has the start of real media and Firestore call signaling.

### Settings

Primary files:

- `src/components/AppSettingsMenu.tsx`
- `src/components/SettingsDialog.tsx`
- `src/services/userSettingsService.ts`
- `src/hooks/useUserSettings.ts`
- `src/pages/ProfileSettings.tsx`

Settings stored in Firestore `user_settings`:

- Notification settings.
- Security settings.
- Appearance settings.
- Call settings.
- Chat behavior settings.
- Theme settings.

Profile-specific data is stored in `profiles`, not `user_settings`.

### Security panel features

Features with dedicated files:

- `src/components/SecurityPanel.tsx`
- `src/components/PanicMode.tsx`
- `src/components/HoldPanicButton.tsx`
- `src/components/BiometricAuth.tsx`
- `src/components/ScreenLock.tsx`
- `src/components/LockdownMode.tsx`
- `src/components/DecoyAppIcon.tsx`
- `src/components/BurnerIdentities.tsx`
- `src/components/DeadManSwitch.tsx`
- `src/components/EncryptedFileVault.tsx`
- `src/components/GhostSessionManager.tsx`
- `src/components/BroadcastChannels.tsx`

Some of these features have UI and Firestore collection support, but should be retested before being described as production-complete. For any security feature, confirm the actual data path and permissions before promising behavior to users.

## Tactical UI System

The current app is moving toward the "Fortress Terminal" tactical UI.

Primary files:

- `src/lib/fortress.ts` - color tokens, version, build id, mark metadata, swatches.
- `src/index.css` - global Tailwind layers, type scale, base styles.
- `src/components/tactical/primitives.tsx` - reusable tactical switches, rows, chips, dividers.
- `src/components/tactical/ComposerModeBar.tsx` - UNCLASS / CONF / SECRET and burn controls.
- `src/components/SettingsDialog.tsx` - terminal settings modal.
- `src/components/Sidebar.tsx` - left-side terminal panel.
- `src/components/ChatHeader.tsx` - protected channel header.
- `src/components/MessageInput.tsx` - bottom composer.

Version:

```ts
// src/lib/fortress.ts
export const FORTRESS_VERSION = 'v2.7';
export const FORTRESS_BUILD = '0613Z';
```

When user-visible UI changes ship, update `FORTRESS_VERSION` and `FORTRESS_BUILD` in `src/lib/fortress.ts`.

Text scale:

- Tactical UI text should generally use the `ft-*` classes in `src/index.css`.
- Avoid falling back to large shadcn defaults such as `text-lg`, `text-base`, or `text-sm` inside tactical panels unless intentionally needed.
- Keep real mobile text inputs at 16px on mobile to avoid iOS zoom-on-focus.

If the live app text looks blurry or mismatched:

1. Check `src/index.css` for global font rendering and `ft-*` classes.
2. Check whether a component is still using raw Tailwind `text-lg`, `text-base`, or `text-sm`.
3. Check `src/lib/fortress.ts` for color/token drift.
4. Check Chrome zoom level and display scaling before changing CSS.
5. Compare the specific component against the tactical primitives instead of editing one-off styles.

## Landing Page

Primary file:

- `src/pages/Auth.tsx`

The landing page content explains:

- Protected messaging channels.
- Key-locked media.
- Burn after reading.
- Images, GIFs, files, and secure payloads.
- Call signs.
- Team communication.
- Available privacy controls.
- Coming-soon privacy controls.

The login and account creation forms open in a dialog from the landing page.

## PWA And Mobile

Primary files:

- `public/manifest.json` or app manifest assets if present.
- `public/sw.js`
- `src/components/PWAInstallPrompt.tsx`
- `capacitor.config.ts`
- `src/components/MobileNavBar.tsx`
- `src/hooks/use-mobile.tsx`

The app is built as a web app first and has Capacitor dependencies for mobile packaging.

Troubleshooting:

- If install prompt does not show, check browser PWA eligibility, manifest, service worker, and HTTPS.
- If mobile layout breaks, check `use-mobile.tsx`, `MobileNavBar.tsx`, and responsive classes in `Sidebar`, `ChatArea`, and `MessageInput`.

## Security Notes

1. Firebase API keys and Supabase publishable keys are public client identifiers. Security must come from Firebase rules, Supabase policies, and server-only keys staying private.
2. `SUPABASE_SERVER_KEY` must only exist in Netlify server environment variables or trusted local server context. Never prefix it with `VITE_`.
3. Encrypted media keys are intentionally removed from stored message metadata. Do not remove `stripEncryptedPayloadSecrets()`.
4. The Supabase `chat-attachments` bucket is currently public. Encrypted `.enc` payloads rely on client-side encryption for secrecy. Normal images/files are publicly readable by URL.
5. If private, signed-url-only media is required later, change the bucket from public to private and update `uploadChatAttachment()` plus message rendering to use signed URLs.
6. Firestore rules currently allow broad signed-in access for some collaboration collections. Tighten rules before claiming strong tenant isolation for those features.
7. For code changes touching auth, file upload, storage, secrets, deletion, or Firestore rules, run Rafter and review the exact input-to-sink path before shipping.

## What To Change And Where

| Task | Start here |
| --- | --- |
| Update app version/build text | `src/lib/fortress.ts` |
| Change tactical colors | `src/lib/fortress.ts`, then component-specific overrides |
| Fix global tactical font sizes | `src/index.css` |
| Change the landing page copy | `src/pages/Auth.tsx` |
| Change login/signup behavior | `src/pages/Auth.tsx`, `src/integrations/firebase/client.ts` |
| Change profile form/avatar behavior | `src/pages/ProfileSettings.tsx` |
| Change call sign setup | `src/pages/CallSignSetup.tsx`, `src/components/EditCallSignDialog.tsx` |
| Change left sidebar layout | `src/components/Sidebar.tsx`, `src/components/ContactList.tsx` |
| Change chat header | `src/components/ChatHeader.tsx` |
| Change message bubbles/rendering | `src/components/MessageList.tsx`, `src/components/AttachmentPreview.tsx` |
| Change composer layout/buttons | `src/components/MessageInput.tsx`, `src/components/tactical/ComposerModeBar.tsx` |
| Change direct message persistence | `src/hooks/useDirectMessages.ts`, `src/services/conversationService.ts` |
| Change attachment upload rules | `src/integrations/supabase/storage.ts`, `supabase/chat-attachments-storage.sql` |
| Change encrypted payload behavior | `src/components/EncryptedImageUpload.tsx`, `src/components/EncryptedImageViewer.tsx`, `src/utils/imageEncryption.ts`, `src/utils/encryptedPayloadMessage.ts` |
| Change burn-after-read timing | `src/utils/burnAfterRead.js`, `src/components/BurnAfterReadMessage.tsx` |
| Change GIF search | `src/components/GifPicker.tsx`, `VITE_TENOR_API_KEY` |
| Change status updates | `src/services/statusService.ts`, `src/components/StatusBar.tsx`, `src/components/StatusCreator.tsx`, `src/components/StatusViewer.tsx` |
| Change settings modal | `src/components/SettingsDialog.tsx`, `src/services/userSettingsService.ts` |
| Change Firestore permissions | `firestore.rules` |
| Change Netlify deployment | `netlify.toml`, Netlify dashboard |
| Change Supabase user mirror | `netlify/functions/sync-firebase-user.ts`, `supabase/firebase-user-profiles.sql` |

## Troubleshooting Guide

### App will not open or stays on initializing

Check:

1. Browser console for the first thrown error.
2. `VITE_FIREBASE_API_KEY` exists in Netlify/local env.
3. Firebase Auth is enabled for the chosen sign-in provider.
4. Firestore `profiles/{uid}` exists for the logged-in user.
5. Firestore rules are deployed from `firestore.rules`.
6. Netlify latest deploy completed successfully.

### User logs in but gets redirected to call sign setup

Check Firestore `profiles/{uid}`:

- `callSign` must exist and be non-empty.
- If profile is missing, `Auth.tsx` or `ProfileSettings.tsx` can recreate a basic profile.

### Conversations fail to load

Check:

1. Firestore `conversation_participants` has a document where `user_id` equals the current Firebase UID and `is_active` is true.
2. That participant points to an existing `conversations/{conversationId}`.
3. `direct_messages` documents use the same `conversation_id`.
4. Firestore rules allow signed-in reads.
5. Browser console for query or permission errors.

### Messages send but receiver does not see them

Check:

1. Both users are active participants in the same conversation.
2. Message exists in Firestore `direct_messages`.
3. Sender ID is the sender Firebase UID.
4. Receiver browser has an active Firestore realtime subscription.
5. The app is using the direct-message flow, not an older local-only team/demo message flow.

### Image/file attaches but send fails

Check:

1. Supabase env variables are set in Netlify.
2. Supabase bucket `chat-attachments` exists.
3. `supabase/chat-attachments-storage.sql` has been run against the active Supabase project.
4. File extension is allowed.
5. File MIME type is not blocked.
6. File is under 25 MB.
7. Browser console shows `Supabase upload failed: ...`.

### Encrypted image sends but receiver cannot open it

Check:

1. The stored file name ends in `.enc`.
2. Message attachment metadata includes `salt`, `iv`, `originalName`, and `mimeType`.
3. The sender copied the key before leaving the screen.
4. The receiver entered the exact key.
5. The Supabase public URL returns the encrypted file.
6. `stripEncryptedPayloadSecrets()` is still removing only `shareCode`, not salt or IV.

### GIF picker is empty

Check:

1. `VITE_TENOR_API_KEY` is set.
2. Browser console for Tenor request failures.
3. Network tab for blocked Google/Tenor requests.
4. `GifPicker.tsx` still uses the current Tenor API URL.

### Profile avatar upload fails

Check:

1. File is an image.
2. File is under 5 MB.
3. Firebase Storage rules allow writes to `avatars/{uid}/...`.
4. Firestore `profiles/{uid}` update is allowed.
5. Firebase Storage is enabled for the project.

### Status image upload fails

Check:

1. Firebase Storage rules allow writes to `statuses/{uid}/...`.
2. Firestore rules allow creating `statuses` with `user_id` equal to current UID.
3. The image file is valid.
4. `statusService.ts` can get a Firebase Storage download URL.

### Netlify deploy fails

Check:

1. `npm run build` locally.
2. Netlify build log for TypeScript/Vite errors.
3. Netlify environment variables.
4. Netlify secret scanning. If a deploy fails for exposed secrets, move the value to Netlify env and remove it from committed code.
5. `netlify.toml` still publishes `dist`.

### Supabase user mirror is empty

Check:

1. User logged in and reached `src/pages/Index.tsx`.
2. Browser network shows POST to `/.netlify/functions/sync-firebase-user`.
3. Netlify has `SUPABASE_URL`, `SUPABASE_SERVER_KEY`, `FIREBASE_WEB_API_KEY`, and `FIREBASE_PROJECT_ID`.
4. Supabase SQL from `supabase/firebase-user-profiles.sql` was run.
5. The table is named `public.firebase_user_profiles`.
6. The function logs in Netlify show no Firebase token verification error.

## Database Setup Scripts

Run these in Supabase SQL Editor if the Supabase project is reset or recreated:

```text
supabase/chat-attachments-storage.sql
supabase/firebase-user-profiles.sql
```

Deploy Firestore rules with:

```bash
firebase use fortress-message-comm
firebase deploy --only firestore:rules
```

## Pre-Ship Checklist

Before pushing:

```bash
npm run lint
npm run build
git status
```

For security-sensitive changes:

```bash
npx @rafter-security/cli agent init --all
```

Then run the appropriate Rafter scan or review flow. Security-sensitive changes include auth, Firestore rules, Supabase policies, file upload, storage paths, encrypted payload handling, secrets, deletion, or dependency changes.

Manual smoke test:

1. Open `/auth`.
2. Sign in.
3. Confirm call sign loads in the sidebar.
4. Search for another user.
5. Send a text message.
6. Send a normal image.
7. Send a GIF.
8. Send an encrypted image and decrypt it from the other account.
9. Send a burn-after-read message and confirm it deletes after opening.
10. Open settings and confirm profile, privacy, chat, notification, call, theme, and about sections render.

## Known Implementation Notes

- Direct messages are the main live/persistent chat path.
- `useChatMessages.ts` still manages an older local message state path for some non-direct/team screens.
- `CallInterface.tsx` is a call UI/timer experience. `VoiceVideoCall.tsx` contains browser media and Firestore call signaling but should be checked before claiming production calling.
- Firebase Storage rules are not currently tracked in this repo.
- The Supabase attachment bucket is currently public.
- Some advanced security modules are present but should be tested before being presented as fully complete.
