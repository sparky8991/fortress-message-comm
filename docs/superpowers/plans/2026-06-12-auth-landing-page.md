# Auth Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bare auth page with a public SecureChat landing page and move sign-in/sign-up into a modal.

**Architecture:** Keep the existing Firebase auth handlers in `src/pages/Auth.tsx`. Add landing-page content, section arrays, and a controlled Radix Dialog around the existing auth form so the behavior changes only at the presentation layer.

**Tech Stack:** React, TypeScript, Firebase Auth, Firestore, shadcn/Radix Dialog, Tailwind CSS, Lucide icons.

---

### Task 1: Preserve Auth Behavior

**Files:**
- Modify: `src/pages/Auth.tsx`

- [x] Keep the existing Google sign-in, email sign-in, account creation, profile creation, and redirect behavior.
- [x] Add modal state with `authDialogOpen` and `isLogin`.
- [x] Add one helper that opens the dialog in sign-in or create-account mode and clears prior form state.

### Task 2: Build Landing Content

**Files:**
- Modify: `src/pages/Auth.tsx`

- [x] Add the approved hero copy, who-it-is-for copy, feature copy, privacy controls, how-it-works copy, security note, final CTA, and footer.
- [x] Use `public/web-app-manifest-192x192.png` as the logo asset.
- [x] Keep claims aligned with current functionality: no unqualified end-to-end or device-level screenshot blocking claims.

### Task 3: Auth Modal

**Files:**
- Modify: `src/pages/Auth.tsx`

- [x] Move the existing auth form into `DialogContent`.
- [x] CTA buttons open the modal in the correct mode.
- [x] Footer links toggle between sign-in and create-account modes.

### Task 4: Verification

**Files:**
- All changed files

- [x] Run targeted ESLint.
- [x] Run `npm run build`.
- [x] Run Rafter staged secrets scan.
- [ ] Commit, push, and verify Netlify deploy.
