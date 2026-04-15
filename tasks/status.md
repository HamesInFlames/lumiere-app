# Session Status — Lumiere Staff App

## Last session
- **Date:** April 15, 2026
- **Tool used:** Claude Code
- **What was done:**
  - Chat image upload: backend endpoint (POST /channels/:id/messages/image → Cloudinary), ChatInput UI (camera + gallery picker), wired to chat screen
  - Password change: backend endpoint (PUT /auth/change-password), Settings screen expandable form with validation
  - EAS build config: eas.json created with development/preview/production profiles
  - James role updated to owner, channel_roles fixed for proper role separation
- **What's next:**
  - Push to main and redeploy backend on Railway
  - Run `eas build --profile development --platform android` for installable APK
  - Test image upload and password change flows
  - End-to-end test: preorder → calendar → status change → notification
