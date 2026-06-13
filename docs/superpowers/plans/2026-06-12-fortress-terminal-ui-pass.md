# Fortress Terminal UI Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the first SecureChat Fortress terminal-style UI pass without changing message storage, auth, or encryption behavior.

**Architecture:** Keep the existing React component structure and update presentation in the chat shell, sidebar, chat header, message list, composer, and settings dialogs. Use Tailwind utility classes plus a small set of CSS utilities for shared terminal styling.

**Tech Stack:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui, lucide-react.

---

### Task 1: Add Fortress Design Utilities

**Files:**
- Modify: `src/index.css`

- [x] Add reusable CSS classes for terminal panels, command text, and subtle grid/noise backgrounds.
- [x] Keep utilities visual-only and avoid changing shadcn theme tokens globally.

### Task 2: Update App Shell and Sidebar

**Files:**
- Modify: `src/pages/Index.tsx`
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/components/ContactList.tsx`
- Modify: `src/components/StatusBar.tsx`

- [x] Apply the darker Fortress shell background.
- [x] Make the sidebar compact, mono-labeled, and closer to the reference.
- [x] Keep global settings launched from the call-sign card.
- [x] Keep status updates contained in the sidebar without forcing main page scroll.

### Task 3: Update Chat Header

**Files:**
- Modify: `src/components/ChatHeader.tsx`

- [x] Add a top classification/security strip.
- [x] Keep voice, video, and conversation settings controls in the active chat header.
- [x] Avoid unverified claims like device-only keys.

### Task 4: Update Composer and Messages

**Files:**
- Modify: `src/components/MessageInput.tsx`
- Modify: `src/components/MessageList.tsx`

- [x] Add visible message mode chips: Normal, Sensitive, Locked.
- [x] Keep burn-after-read as the existing 2-minute behavior.
- [x] Make the bottom composer match the terminal command bar direction.
- [x] Tighten message bubble styling and metadata rows.

### Task 5: Update Settings Copy

**Files:**
- Modify: `src/components/AppSettingsMenu.tsx`
- Modify: `src/components/PrivacySecuritySettings.tsx`
- Modify: `src/components/ThemeSettingsDialog.tsx`

- [x] Update settings menu labels to match the Fortress language.
- [x] Mark unsupported privacy controls as coming soon where needed.
- [x] Remove overconfident encryption copy.

### Task 6: Verify

**Files:**
- No source edits.

- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Review the local app in a browser.
- [ ] Run Rafter/security review if available because the diff touches message input UI.
