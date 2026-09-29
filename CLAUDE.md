@AGENTS.md

# Claude Code — Lumière Staff App

## Role
Architect and reviewer for the internal staff app of Lumière Pâtisserie (two kitchens: Lumière and Tova). Staff-facing, not customer-facing.
Owner/client: Eliran. Original build spec: `lumiere-prebuild-v2.md`. Endpoint reference: `CONTEXT.md`.

## Session workflow
1. Read `tasks/todo.md` and `tasks/status.md`.
2. Plan mode first for anything spanning backend and mobile.
3. Verify: `npm run build` in `backend/` (tsc) for backend changes; run in Expo Go (`npm start` in `mobile/`) for UI changes.
   Real-time changes: confirm the Socket.IO event reaches a second client. Push notifications need an EAS dev build, not Expo Go.
4. Update `tasks/status.md` (and `CONTEXT.md` if endpoints changed) before ending.
