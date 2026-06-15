# Tactical Legibility Lift — Design

**Date:** 2026-06-13
**Author:** Johnathan Carlson (with Claude Code)
**Status:** Awaiting review

## Problem

The "Fortress Terminal" tactical redesign (from `Encrypted Messaging App_new.zip`) is **already
structurally implemented** across the app — classification strip, channel header + command
sub-strip, sidebar, message classification chips, composer, and the unified Terminal Settings
console are all present and match the prototype.

What's inconsistent is **typography legibility**. The prototype is a *scaled-down mockup*, so its
7–8px micro-labels look proportioned when shrunk but read too small at real 1:1 scale. The
settings console and `tactical/primitives.tsx` were already lifted to a readable floor, but the
rest of the app was not. Two screens never got any tactical pass at all. The result: screens with
7–8px text sit next to the already-lifted settings console and look tiny and unfinished — the
user's "the writing is too small / doesn't look as good" complaint.

This is the one piece the designer offered at the end of the handoff and never completed:
*"apply this same legibility bump to the main chat so the whole app lifts together."*

## Goal

Apply **one consistent legibility floor** across the entire app, keeping the tactical character
(mono, uppercase, wide tracking, density) but making everything readable at 1:1.

### The floor (agreed standard)

| Use | Size | Named class |
|---|---|---|
| Tiny labels / classification chips (the new minimum) | **9px** | `ft-mini` |
| Meta / list subtitles / secondary captions | **10px** | `ft-meta` |
| Body, descriptions, message text, inputs | **11–12px** | `ft-cap` / `ft-body` |
| Emphasis / avatar initials | **13px** | `ft-emph` |
| Header names, contact names, brand | **14px** | `ft-head` |

**Rule: nothing renders below 9px.** Map raw `text-[7px]` / `text-[8px]` up to the floor, and
prefer the named `ft-*` classes over new magic numbers where practical.

## Scope and constraints

**UI-only.** Changes are limited to Tailwind size/spacing class names (and minimal padding tweaks
where larger text would wrap). **No** changes to:

- hooks, services, Firebase/Supabase calls, or any logic/state
- component props, data flow, or JSX structure (beyond wrapping fixes)
- `src/components/ui/**` (shared shadcn primitives — already handled globally by the override
  block in `index.css`)
- `.mobile-input` / real mobile text inputs — these stay ≥16px to prevent iOS zoom-on-focus

Because no data path is touched, functionality cannot regress. The only realistic risk is text
**wrapping** inside tight tactical chips/rows; caught per-slice with a build + visual check and
fixed with padding/width adjustments.

## Work surface

Files with sub-9px text (`text-[1-8px]`), from `grep`:

**Shell (structure already correct — raise micro-labels only):**
- `components/ComposerModeBar.tsx` (3) — `MARK`, mode buttons, burn button
- `components/MessageInput.tsx` (3) — `OUTBOUND MARKED`, E2E/BURN footer, GIF button
- `components/MessageList.tsx` (2) — session line, classification mark chip
- `components/ChatHeader.tsx` (4) — `UNVERIFIED`, `CHANNEL READY`, sub-strip
- `components/Sidebar.tsx` (3) — `FORTRESS TERMINAL`, `CALL SIGN`, `ONLINE`
- `components/ContactList.tsx` (3)

**Screens never lifted (biggest wins):**
- `pages/ProfileSettings.tsx` (25)
- `components/SecurityPanel.tsx` (12)

**Older dialogs / misc:**
- `components/EditCallSignDialog.tsx` (8)
- `components/CreateTeamDialog.tsx` (5)
- `components/ChatSettingsDialog.tsx` (4)
- `components/UserSearchDialog.tsx` (4)
- `components/TeamList.tsx` (2)
- `components/StatusBar.tsx` (2)
- `components/tactical/TacticalTooltip.tsx` (2)
- `components/GifPicker.tsx` (1)
- `components/AboutDialog.tsx` (1)

**Leave alone:** `index.css` override rules (intentional), `src/components/ui/**`, `.mobile-input`.

## Approach — build-verified slices

Each slice is its own commit, with `npm run build` run before declaring it done.

- **Slice 0 — Baseline.** `npm run build` green; record current `FORTRESS_VERSION` (v2.8 / 0614Z).
- **Slice 1 — Shell micro-labels.** ComposerModeBar, MessageInput, MessageList, ChatHeader,
  Sidebar, ContactList → raise 7–8px to the floor. Highest visual impact (the chat the user
  stares at).
- **Slice 2 — Profile page.** `ProfileSettings.tsx` (25) — the single biggest un-lifted screen.
- **Slice 3 — Security panel.** `SecurityPanel.tsx` (12).
- **Slice 4 — Older dialogs.** EditCallSign, CreateTeam, ChatSettings, UserSearch, TeamList,
  StatusBar, TacticalTooltip, GifPicker, AboutDialog.
- **Slice 5 — Visual QA + version bump.** Spot-check for wrapping, fix any, then bump
  `FORTRESS_VERSION` / `FORTRESS_BUILD` in `lib/fortress.ts` and note the change in
  `docs/SECURECHAT_APP_GUIDE.md`.

## Verification per slice

1. `npm run build` passes (no TS/Vite errors).
2. `grep "text-\[[1-8]px\]"` on touched files returns nothing (except intentional exceptions).
3. Visual spot-check (no wrapping/overflow; reads cleanly next to the settings console).

## Success criteria

- No rendered text below 9px anywhere outside `ui/` and `.mobile-input`.
- The main chat, Profile, Security, and dialogs read at the same legible floor as the settings
  console — visually consistent end to end.
- `npm run build` green; no functional change (auth, messaging, uploads, encryption untouched).
