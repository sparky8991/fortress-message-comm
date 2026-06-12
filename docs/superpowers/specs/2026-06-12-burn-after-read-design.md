# Burn After Read V1 Design

## Goal

Add one simple secure-send mode for direct messages: a message can be sent as "Burn after read" and automatically disappears two minutes after the recipient opens it.

## V1 Scope

- Add a single toggle in the message composer: Burn after read.
- When enabled, the next sent message stores burn metadata with a 120-second timer.
- The recipient sees the message behind an "Open secure message" cover.
- Opening the message records the open time and expiration time.
- Both sender and recipient see the countdown after it has been opened.
- After expiration, the app deletes the message from Firestore.

## Data Model

Burn settings live inside `direct_messages.metadata`:

- `burnAfterRead: true`
- `burnAfterReadSeconds: 120`
- `burnOpenedAt: Timestamp | null`
- `burnExpiresAt: Timestamp | null`
- `burnOpenedBy: string | null`

The original message content and attachment metadata stay in the same document.

## Security Design

The browser may update burn metadata when the recipient opens the message. Message deletion is allowed only after the stored expiration time has passed. Firestore rules should not grant broad delete access for normal messages.

This is an app-level privacy control. It cannot prevent screenshots, screen recording, camera photos, copied text, or content already shown in browser memory.

## Follow-Up Notes

- Add Face ID / Touch ID / device PIN before opening secure messages on supported mobile devices. This should be designed later with Capacitor biometric/device credential support and a fallback for desktop.
- Add more burn options later: view-once, custom timers, timed delete even if unread, and encrypted-image burn mode.
