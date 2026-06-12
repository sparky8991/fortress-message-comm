# Burn After Read Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a simple 2-minute burn-after-read mode for direct messages.

**Architecture:** Store burn settings in direct message metadata, render unopened burn messages behind an open button, record open and expiration timestamps when the recipient opens the message, and delete expired messages from the client with Firestore rules restricting deletes to expired burn messages or sender-owned messages.

**Tech Stack:** React, TypeScript, Firebase Auth, Firestore, Vite, Tailwind, Lucide icons.

---

### Task 1: Burn Metadata Helpers

**Files:**
- Create: `src/utils/burnAfterRead.js`
- Create: `src/utils/burnAfterRead.d.ts`
- Create: `scripts/test-burn-after-read.mjs`

- [x] Write a small failing Node test that checks countdown and expired-state calculations.
- [x] Implement pure helper functions for extracting burn metadata, identifying unopened burn messages, computing countdown seconds, and checking expiration.
- [x] Run the Node test and confirm it passes.

### Task 2: Message Model and Firestore Rules

**Files:**
- Modify: `src/constants/initialMessages.ts`
- Modify: `src/services/conversationService.ts`
- Modify: `firestore.rules`

- [x] Add burn metadata typing to message models.
- [x] Persist metadata on direct messages without changing the public message API shape beyond metadata.
- [x] Allow non-sender deletion only for expired burn-after-read messages.

### Task 3: Message Composer Toggle

**Files:**
- Modify: `src/components/MessageInput.tsx`
- Modify: `src/components/ChatArea.tsx`

- [x] Add a flame/timer toggle in the composer.
- [x] When enabled, attach `burnAfterRead`, `burnAfterReadSeconds`, and null open/expire fields to the next outgoing message.
- [x] Reset the toggle after successful send.

### Task 4: Open and Burn UI

**Files:**
- Create: `src/components/BurnAfterReadMessage.tsx`
- Modify: `src/components/MessageList.tsx`

- [x] Render unopened received burn messages behind an open control.
- [x] On open, write `burnOpenedAt`, `burnExpiresAt`, and `burnOpenedBy`.
- [x] Show countdown for opened burn messages.
- [x] Delete messages once their countdown expires.

### Task 5: Verification and Deploy

**Files:**
- All changed files

- [x] Run targeted lint for changed files.
- [x] Run `npm run build`.
- [x] Run Rafter staged secrets scan.
- [ ] Commit, push, verify Netlify deploy, then run remote Rafter scan on `main`.
