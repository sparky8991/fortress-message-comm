# Fortress UI handoff implementation plan

## Goal

Move the live app toward the tactical terminal UI in the reference handoff without replacing the working Firebase, Supabase, and message-delivery paths.

## First slice

1. Add shared Fortress UI constants and tactical primitives.
2. Replace the message composer mode row with the new Normal, Sensitive, Locked, and Burn controls.
3. Add one unified terminal settings console for profile, privacy, chat, notifications, calls, theme, and about.
4. Wire the sidebar settings gear to the unified console.
5. Restyle the user search dialog and call-sign card to match the new spacing.
6. Verify with build/lint and inspect any failures before pushing.

## Security notes

- No database schema changes in this slice.
- Settings continue to persist through the existing `user_settings` Firestore document.
- Locked payload behavior remains unchanged. The UI only makes that flow easier to find.
- Copy avoids claims the current web app cannot enforce, such as fully blocking screenshots.
