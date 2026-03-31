# Lumiere Pasterie Staff App — Master Reference Document (v2)
> Last updated: March 30, 2026

---

## Stack (Locked)

| Layer | Technology |
|---|---|
| Mobile App | React Native + Expo |
| Backend API | Node + Express + TypeScript on Railway |
| Database | PostgreSQL on Railway |
| Realtime Chat | Socket.io |
| File/Photo Storage | Cloudinary (free tier) |
| Push Notifications | Expo Push Notifications |
| Auth | JWT stored in expo-secure-store |
| Build Tool | Cursor Agent (Opus) + Claude Code |

**Live URLs:**
- Backend API: `https://lumiere-staff-api-production.up.railway.app`
- GitHub: `https://github.com/HamesInFlames/lumiere-app`
- Project path: `C:\Users\xoxok\Projects\lumiere-app`

---

## Business Context

**Lumière Pâtisserie** — French pastry shop in Thornhill, Ontario.
- Owner: **Eliran** (uses desktop, manages wholesale orders)
- Bar Staff: front of house team
- Kitchen Staff: **Cat** (Lumiere kitchen), **Jade** (Tova kitchen) — separate physical locations

This app replaces WhatsApp group chats used for operations:
- **LUMIERE OFFICIAL** — all staff, pre-orders, wholesale, kitchen ready confirmations
- **LUMIERE BAR TEAM** — bar staff + owner, daily comms, TGTG, inventory needs
- **LUMIERE KITCHEN** — Cat's team
- **TOVA KITCHEN** — Jade's team

---

## Roles & Permissions

| Action | Owner | Bar Staff | Kitchen Staff |
|---|---|---|---|
| Access all channels | ✅ | ❌ | ❌ |
| Access Official + Bar | ✅ | ✅ | ❌ |
| Access Official + Kitchen | ✅ | ❌ | ✅ |
| Create pre-orders | ✅ | ✅ | ❌ |
| Edit/delete own pre-orders | ✅ | ✅ | ❌ |
| Edit/delete any order | ✅ | ❌ | ❌ |
| Create wholesale | ✅ | ❌ | ❌ |
| Edit wholesale | ✅ | ❌ | ❌ |
| Mark order prepared/ready | ✅ | ❌ | ✅ |
| Attach ready photos | ✅ | ❌ | ✅ |
| Mark picked up / no-show | ✅ | ✅ | ❌ |
| View bar inventory | ✅ | ✅ | ❌ |
| View kitchen inventory | ✅ | ❌ | ✅ |
| Edit inventory | ✅ | ✅ | ✅ |
| Manage users | ✅ | ❌ | ❌ |
| Receive low-stock alerts | ✅ | ❌ | ❌ |
| Receive order-ready alerts | ✅ | ✅ | ❌ |
| Create/edit recipes | ✅ | ❌ | ✅ (own kitchen) |
| View all recipes | ✅ | ✅ | ✅ |

**Important UX rule:** Double confirmation before any delete or destructive action anywhere in the app.

---

## What Is Built (Complete)

### Backend — 100% built and deployed
All endpoints live at `https://lumiere-staff-api-production.up.railway.app`

✅ Auth (login, JWT, role middleware)
✅ Channels (role-based access, messages, pagination)
✅ Socket.io realtime (join/leave rooms, new_message events)
✅ Pre-orders (create, edit, delete, status transitions)
✅ Wholesale orders (owner only, by kitchen)
✅ Order attachments (Cloudinary photo upload)
✅ Calendar endpoint (day/week/month, preorder + wholesale)
✅ No-show checker (cron job every 15 min, push notifications)
✅ Inventory (bar + kitchen, history, low-stock alerts)
✅ Products (preloaded list for order entry)

### Mobile — Partially built
✅ Auth (login screen, JWT storage, role-based routing)
✅ Tab navigation (role-aware: owner/bar sees 4 tabs, kitchen sees 3)
✅ Channels list screen
✅ Channel chat screen (messages, Socket.io realtime, send messages)
✅ MessageBubble component (own/other, timestamps fixed)
✅ ChatInput component
✅ OrderCard component (shows in chat, PRE-ORDER/WHOLESALE badge, status color)

❌ Orders list screen (placeholder only)
❌ Order detail screen
❌ Pre-order creation form
❌ Wholesale creation form
❌ Calendar screen
❌ Inventory screen
❌ Recipe module
❌ AI wholesale paste tool

### Known bugs (minor, fix when convenient)
- Pickup date format on OrderCard shows "Apr 4 14:00:00" — needs formatting to "Apr 4 at 2:00 PM"
- Tapping OrderCard navigates to /orders/[id] which doesn't exist yet (expected — fix after building order detail screen)

---

## What Needs To Be Built (Mobile)

### Prompt 9 — Orders Module
Files to create:
- `mobile/app/(app)/orders/_layout.tsx` — Stack navigator
- `mobile/app/(app)/orders/index.tsx` — Orders list
- `mobile/app/(app)/orders/[id].tsx` — Order detail
- `mobile/app/(app)/orders/preorder/create.tsx` — Fast entry form

### Prompt 10 — Wholesale UI
Files to create:
- `mobile/app/(app)/orders/wholesale/create.tsx` — Owner only

### Prompt 11 — Calendar Screen
Files to create:
- `mobile/app/(app)/calendar/index.tsx` — Day/week/month views

### Prompt 12 — Inventory Screen
Files to create:
- `mobile/app/(app)/inventory/index.tsx` — Bar + kitchen tabs

### Prompt 13 — Recipe Module (new)
Backend + mobile feature. See spec below.

### Prompt 14 — AI Wholesale Paste Tool (new)
Mobile feature. See spec below.

---

## Prompt 9 — Orders Module

```
Build the Orders section of the mobile app for Lumiere Pasterie Staff App.
Project is at: C:\Users\xoxok\Projects\lumiere-app
Backend is live at: https://lumiere-staff-api-production.up.railway.app
Use the axios instance from mobile/lib/api.ts for all API calls.
Use snake_case for all API field names (customer_name, pickup_date, etc.)

1. mobile/app/(app)/orders/_layout.tsx
- Stack navigator for orders section
- headerShown: true

2. mobile/app/(app)/orders/index.tsx
- Fetch GET /api/orders/calendar?view=month&date=[TODAY ISO DATE]&type=all
- Show two sections with SectionList: "Pre-orders" and "Wholesale"
- Each row shows:
  - customer_name (preorder) or wholesale_code (wholesale)
  - pickup_date/pickup_time or due_date/due_time_context
  - status badge (red: new/confirmed/in_preparation/prepared, green: picked_up, yellow: no_show, gray: cancelled)
  - item_count
- Floating + FAB button bottom right:
  - owner: shows menu with "Pre-order" and "Wholesale"
  - bar_staff: taps directly to create pre-order
  - kitchen_staff: no button
- Tap order row → navigate to /orders/[id]
- Pull to refresh
- Empty state message if no orders

3. mobile/app/(app)/orders/[id].tsx
- Fetch GET /api/orders/:id on mount
- Show full order details:
  - Status badge at top (color coded)
  - Type badge (PRE-ORDER / WHOLESALE)
  - Customer name + phone (preorder) or wholesale code (wholesale)
  - Pickup date/time or due date
  - Items list grouped by kitchen (wholesale) or flat list (preorder)
  - Notes
  - Attachments section — show photos if any
  - Created by + created at
  - Last edited by + last edited at (if edited = true)
- Status action buttons based on role and current status:
  - owner/bar_staff can set: confirmed, picked_up, no_show, cancelled
  - owner/kitchen_staff can set: in_preparation, prepared
  - Only show buttons for valid next statuses
  - Calls PATCH /api/orders/:id/status
- Edit button (top right) for owner and bar_staff on their own orders
- Delete button for owner only — double confirm before deleting
- Attach photo button for kitchen_staff and owner:
  - Opens image picker (expo-image-picker)
  - POST /api/orders/:id/attachments as multipart form

4. mobile/app/(app)/orders/preorder/create.tsx
- IMPORTANT: This form must feel faster than typing in WhatsApp
- Fields in this exact order:
  1. Payment status — two large toggle buttons: PAID | NOT PAID
  2. Pickup date — tap to open DateTimePickerModal
  3. Pickup time — tap to open time picker
  4. Customer name — text input
  5. Phone number — numeric keyboard
  6. Line items (repeatable):
     - Quantity — small numeric input
     - Product — tap to open bottom sheet modal with search + list from GET /api/products
     - Item notes — optional text
     - + Add item button
  7. Order notes — multiline text
  8. Submit button
- On submit: POST /api/orders/preorder
- On success: navigate back to orders list + show success toast
- Install react-native-modal-datetime-picker if not already in package.json

Use StyleSheet for all styles. No external UI libraries except date picker.
Double confirm before any destructive action.
```

---

## Prompt 10 — Wholesale Creation

```
Build the wholesale creation screen for Lumiere Pasterie Staff App.
Project is at: C:\Users\xoxok\Projects\lumiere-app
Backend live at: https://lumiere-staff-api-production.up.railway.app
Use axios instance from mobile/lib/api.ts. Use snake_case field names.

File: mobile/app/(app)/orders/wholesale/create.tsx
OWNER ONLY — redirect non-owners away

Fields:
1. Wholesale code/nickname — text input (e.g. "H", "C-C")
2. Due date — date picker
3. Due time context — segmented options: EOD | Morning | Afternoon | Custom
4. Kitchen sections (repeatable, start with one):
   - Kitchen selector: LUMIERE | TOVA toggle
   - Line items (repeatable):
     - Product — searchable bottom sheet from GET /api/products
     - Quantity — numeric input
   - + Add item button
5. + Add another kitchen button (for orders split between Lumiere and Tova)
6. Notes — optional text
7. Submit button

On submit: POST /api/orders/wholesale with format:
{
  wholesale_code, due_date, due_time_context, notes,
  kitchens: [{ kitchen: 'lumiere'|'tova', items: [{ product_name, quantity }] }]
}

On success: navigate back to orders list.
Use StyleSheet. No external UI libraries.
```

---

## Prompt 11 — Calendar Screen

```
Build the Calendar screen for Lumiere Pasterie Staff App.
Project is at: C:\Users\xoxok\Projects\lumiere-app
Backend live at: https://lumiere-staff-api-production.up.railway.app
Use axios instance from mobile/lib/api.ts.

File: mobile/app/(app)/calendar/index.tsx

Replace the current placeholder with a real calendar screen.

Features:
1. View toggle at top: Day | Week | Month
2. Filter toggles: Pre-orders ON/OFF | Wholesale ON/OFF
3. Date navigation: < prev | current date label | next >
4. Fetch GET /api/orders/calendar?view=[view]&date=[date]&type=[type] on load and when filters/date change

Day view:
- Time slots 7am to 10pm
- Orders with pickup_time placed on timeline
- Orders without time in "All Day / Time TBD" section at top
- Never hide any order

Week view:
- 7 columns (Mon-Sun)
- Orders as colored blocks on their date
- Compact: name/code + status dot

Month view:
- Standard month grid
- Dots per day showing order count
- Tap day → switch to day view for that date

Order colors:
- Red: new, confirmed, in_preparation, prepared
- Green: picked_up
- Yellow: no_show
- Gray: cancelled

Tap order → navigate to /orders/[id]

Use StyleSheet. Build lean — no heavy calendar library.
```

---

## Prompt 12 — Inventory Screen

```
Build the Inventory screen for Lumiere Pasterie Staff App.
Project is at: C:\Users\xoxok\Projects\lumiere-app
Backend live at: https://lumiere-staff-api-production.up.railway.app
Use axios instance from mobile/lib/api.ts.

File: mobile/app/(app)/inventory/index.tsx

Replace the current placeholder with a real inventory screen.

Layout:
- Two tabs: Bar | Kitchen
- Tab visibility based on role:
  - bar_staff: Bar tab only
  - kitchen_staff: Kitchen tab only
  - owner: both tabs
- Fetch GET /api/inventory?module=bar or kitchen

Per item show:
- Item name
- Quantity + unit (e.g. "4 bags")
- Red warning indicator if quantity <= low_threshold
- Tap to edit inline

Inline edit:
- Tap item → input appears with current quantity
- User enters new quantity
- PATCH /api/inventory/:id
- Optimistic update in UI
- Success toast

Add item FAB (+):
- Bottom sheet form: name, unit, quantity, low_threshold
- POST /api/inventory
- module set automatically based on current tab

Owner only: tap item → see history link → GET /api/inventory/:id/history in modal

Use StyleSheet. Low stock items visually prominent (red badge or warning icon).
```

---

## Prompt 13 — Recipe Module

### Backend additions needed first:
```sql
CREATE TABLE recipe_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  kitchen TEXT NOT NULL DEFAULT 'both', -- 'lumiere', 'tova', 'both'
  category_id UUID REFERENCES recipe_categories(id),
  ingredients TEXT, -- flexible text for now
  instructions TEXT, -- optional
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_edited_by UUID REFERENCES users(id),
  last_edited_at TIMESTAMPTZ
);
```

### Backend routes:
- GET /api/recipes — all recipes, supports ?kitchen=lumiere|tova|both and ?category=id
- POST /api/recipes — owner or kitchen_staff only
- PATCH /api/recipes/:id — owner or creator only
- DELETE /api/recipes/:id — owner or creator only (double confirm)
- GET /api/recipe-categories — all categories
- POST /api/recipe-categories — owner or kitchen_staff

### Mobile screens:
- `mobile/app/(app)/recipes/index.tsx` — Recipe list with search, kitchen toggle filter (Lumiere/Tova/Both), category filter
- `mobile/app/(app)/recipes/[id].tsx` — Recipe detail with share options
- `mobile/app/(app)/recipes/create.tsx` — Create/edit form

### Recipe features:
- Search bar by recipe name
- Toggle: show Lumiere / Tova / Both
- Filter by category
- Category is user-created (e.g. "Puff Pastry", "Cakes", "Personal Desserts")
- Created by + last edited by shown on each recipe
- Share options:
  - Copy to clipboard (for pasting into WhatsApp)
  - Share via native share sheet
  - Print-friendly view
- Double confirm before delete

### Permissions:
- Owner, Cat (kitchen_staff at Lumiere), Jade (kitchen_staff at Tova) can create/edit
- Bar staff can view only
- Everyone sees all recipes (toggle to filter by kitchen)

---

## Prompt 14 — AI Wholesale Paste Tool (NEW FEATURE)

### What it does:
Eliran communicates with wholesale clients via WhatsApp. He receives orders in various formats and manually reformats them before sending to the kitchen. This tool lets him paste raw WhatsApp text and AI automatically parses it into the structured wholesale order form.

### How it works:
1. On the wholesale creation screen, there is a "Paste from WhatsApp" button at the top
2. Eliran taps it → a text area opens
3. He pastes the raw WhatsApp message (any format)
4. Taps "Parse" → app calls Anthropic API with the raw text
5. AI returns structured JSON matching the wholesale order format
6. Form auto-fills with parsed data
7. Eliran reviews, adjusts if needed, and submits

### Example input:
```
H order for Friday
Lumiere side:
Red velvet x5
Daisy x8
Raspberry pistachio x6
Tova:
Tiramisu x5
Coconut truffle x3
```

### Example AI output:
```json
{
  "wholesale_code": "H",
  "due_date": "2026-04-03",
  "due_time_context": "EOD",
  "kitchens": [
    {
      "kitchen": "lumiere",
      "items": [
        { "product_name": "Red Velvet", "quantity": 5 },
        { "product_name": "Daisy", "quantity": 8 },
        { "product_name": "Raspberry Pistachio Tart", "quantity": 6 }
      ]
    },
    {
      "kitchen": "tova",
      "items": [
        { "product_name": "Tiramisu", "quantity": 5 },
        { "product_name": "Coconut Truffle", "quantity": 3 }
      ]
    }
  ]
}
```

### Implementation:
- Uses Anthropic API (claude-sonnet-4-20250514) called directly from the mobile app
- System prompt instructs it to parse wholesale orders and return only JSON
- Pass the current product list to the AI so it can match product names correctly
- If a product name doesn't exactly match, AI picks the closest match from the list
- If due date is a day name (e.g. "Friday"), AI resolves it to the next upcoming Friday
- Owner only feature

### Mobile implementation:
File: `mobile/app/(app)/orders/wholesale/create.tsx`

Add at the top of the form:
```
[Paste from WhatsApp ↓]
```

Tap → opens modal with:
- Large multiline text input
- "Parse Order" button
- Loading state while AI processes
- On success: closes modal and auto-fills the form
- On error: shows error message, keeps modal open

---

## Database Schema (Complete)

```sql
-- Already deployed to Railway PostgreSQL

CREATE TABLE users (id, name, email, password, role, push_token, active, created_at)
CREATE TABLE channels (id, name, label)
CREATE TABLE channel_roles (channel_id, role)
CREATE TABLE messages (id, channel_id, user_id, type, content, image_url, order_id, created_at)
CREATE TABLE products (id, name, active)
CREATE TABLE orders (id, type, status, created_by, created_at, updated_at, edited,
  last_edited_by, last_edited_at, payment_status, pickup_date, pickup_time,
  customer_name, phone_number, notes, wholesale_code, due_date, due_time_context,
  no_show_notified)
CREATE TABLE order_items (id, order_id, product_id, product_name, quantity, kitchen, notes)
CREATE TABLE order_attachments (id, order_id, uploaded_by, image_url, note, created_at)
CREATE TABLE inventory_items (id, name, module, unit, quantity, low_threshold, updated_by, updated_at)
CREATE TABLE inventory_history (id, item_id, previous_qty, new_qty, changed_by, changed_at)

-- Still needs to be added (Prompt 13):
CREATE TABLE recipe_categories (id, name, created_by, created_at)
CREATE TABLE recipes (id, name, kitchen, category_id, ingredients, instructions,
  created_by, created_at, updated_at, last_edited_by, last_edited_at)
```

---

## Build Order (Remaining)

| Step | What | Status |
|---|---|---|
| 1-8 | Backend + Mobile foundation + Chat | ✅ Done |
| 9 | Orders list + detail + preorder form | ❌ Next |
| 10 | Wholesale creation form | ❌ |
| 11 | Calendar screen | ❌ |
| 12 | Inventory screen | ❌ |
| 13 | Recipe module (backend + mobile) | ❌ |
| 14 | AI wholesale paste tool | ❌ |
| 15 | Push notifications setup (Expo) | ❌ |
| 16 | Testing + polish | ❌ |

---

## Key Rules (Always Follow)

1. Never modify working code unless the prompt specifically asks
2. Never add dependencies without checking package.json first
3. Always use TypeScript — no `any` unless absolutely necessary
4. Always use StyleSheet for React Native — no inline styles
5. Always use the axios instance from `mobile/lib/api.ts`
6. Always use snake_case field names from backend (customer_name, not customerName)
7. Double confirmation before any delete or destructive action
8. Backend is fully built — do not regenerate backend files unless asked
9. One prompt = one focused task

---

## Environment Variables

### Backend (Railway)
```
PORT=3000
DATABASE_URL=postgresql://postgres:...@postgres.railway.internal:5432/railway
JWT_SECRET=lumiere_super_secret_key_change_this_later
JWT_EXPIRES_IN=30d
CLOUDINARY_CLOUD_NAME=dgkja0gvw
CLOUDINARY_API_KEY=137236615418378
CLOUDINARY_API_SECRET=RqcC4Trh7pUfeKtey2wcScDNHfo
```

### Mobile
```
EXPO_PUBLIC_API_URL=https://lumiere-staff-api-production.up.railway.app
EXPO_PUBLIC_SOCKET_URL=https://lumiere-staff-api-production.up.railway.app
```

---

## Future (Post v1)

- Online ordering on the website connecting to the same backend
- Eliran's desktop view (web app) for wholesale management
- Analytics dashboard
- Staff scheduling
- Stripe payment integration for online orders
