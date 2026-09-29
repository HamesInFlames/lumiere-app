# AGENTS.md — Universal AI Agent Configuration

## Project
- Name: Lumiere Staff App
- Company: Kim Consultant (kimconsultant.net)
- Developer: James
- Stack: React Native (Expo SDK 54), Express, PostgreSQL, Socket.IO
- Hosting: Railway (backend API + PostgreSQL)
- Repo: github.com/HamesInFlames/lumiere-app
- Backend (prod): lumiere-staff-api-production.up.railway.app

## Architecture
- Mobile: Expo Go, React Native 0.81, expo-router v6, Zustand (state), Axios (HTTP)
- Backend: Express, Socket.IO (WebSocket), Cloudinary (images), expo-server-sdk (push), node-cron (jobs)
- Database: PostgreSQL 18.3 on Railway

## Code conventions
- TypeScript for all new code
- React Native functional components with hooks only
- Zustand for state management
- ESM imports, no CommonJS
- TypeScript: avoid `any`
- API field names are snake_case end to end (`customer_name`, `pickup_date`, `last_edited_by`)
- Mobile: every HTTP call goes through the axios instance in `mobile/lib/api.ts`; styles via `StyleSheet.create`, no inline style objects
- Destructive UI actions (delete, cancel order, no-show) need two confirmations (two `Alert.alert` steps)
- Check `package.json` before adding a dependency; Expo SDK 54 compatibility first (`npx expo install`)

## File structure
- /mobile — Expo mobile app
- /backend — Express API server
- /tasks/todo.md — current task list
- /tasks/decisions.md — architecture decisions
- /tasks/status.md — session continuity

## Workflow
- Read tasks/todo.md before starting work
- Update tasks/status.md after each session
- Log decisions in tasks/decisions.md
- Test on Expo Go before committing

## Do NOT
- Install packages without documenting in decisions.md
- Modify Railway deployment config without approval
- Delete or overwrite .env files
- Hardcode API URLs — use environment variables
