# Lumiere Staff App — Developer Context

> Single source of truth for Claude Code, Cursor, and any developer/QA working on this project.
> Last updated: April 10, 2026 | Commit: `e391bbb`

---

## Project Overview

**What:** Internal staff app for Lumiere Patisserie (French pastry shop with two kitchens: Lumiere and Tova)
**Stack:** React Native (Expo SDK 54) + Express + PostgreSQL + Socket.IO
**Repo:** `https://github.com/HamesInFlames/lumiere-app`
**Local path:** `C:\Users\xoxok\Projects\lumiere-app`
**Backend (prod):** `https://lumiere-staff-api-production.up.railway.app`
**Database:** PostgreSQL 18.3 on Railway

---

## Architecture

```
┌─────────────────────┐     ┌──────────────────────────┐     ┌─────────────┐
│  Mobile (Expo Go)   │────▶│  Express API (Railway)   │────▶│  PostgreSQL  │
│  React Native 0.81  │     │  Socket.IO (WebSocket)   │     │  (Railway)   │
│  expo-router v6     │     │  Cloudinary (images)     │     └─────────────┘
│  Zustand (state)    │     │  expo-server-sdk (push)  │
│  Axios (HTTP)       │     │  node-cron (jobs)        │
└─────────────────────┘     └──────────────────────────┘
```

---

## Key Versions

### Mobile (`mobile/package.json`)
| Package | Version |
|---------|---------|
| expo | ~54.0.33 |
| react | 19.1.0 |
| react-native | 0.81.5 |
| expo-router | ~6.0.23 |
| typescript | ~5.9.2 |
| zustand | ^5.0.12 |
| axios | ^1.14.0 |
| socket.io-client | ^4.8.3 |
| expo-notifications | ~0.32.16 |
| expo-secure-store | ~15.0.8 |
| expo-constants | ~18.0.13 |
| expo-image-picker | ~17.0.10 |
| expo-device | ~8.0.10 |
| @react-native-community/datetimepicker | 8.4.4 |
| react-native-modal-datetime-picker | ^18.0.0 |

### Backend (`backend/package.json`)
| Package | Version |
|---------|---------|
| express | ^4.21.2 |
| typescript | ^5.7.3 |
| pg | ^8.13.1 |
| socket.io | ^4.8.1 |
| jsonwebtoken | ^9.0.2 |
| bcryptjs | ^2.4.3 |
| multer | ^1.4.5-lts.1 |
| cloudinary | ^2.5.1 |
| expo-server-sdk | ^6.1.0 |
| node-cron | ^4.2.1 |
| cors | ^2.8.5 |

---

## Environment Variables

### Backend (`.env`)
```
PORT=3000
DATABASE_URL=postgresql://postgres:PASSWORD@HOST:PORT/DATABASE
JWT_SECRET=<secret>
JWT_EXPIRES_IN=30d
CLOUDINARY_CLOUD_NAME=<value>
CLOUDINARY_API_KEY=<value>
CLOUDINARY_API_SECRET=<value>
```

### Mobile (`.env`)
```
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000          # Android emulator → localhost
EXPO_PUBLIC_SOCKET_URL=http://10.0.2.2:3000
EXPO_PUBLIC_ANTHROPIC_API_KEY=<optional, for AI wholesale paste>
```

**Production mobile `.env`:**
```
EXPO_PUBLIC_API_URL=https://lumiere-staff-api-production.up.railway.app
EXPO_PUBLIC_SOCKET_URL=https://lumiere-staff-api-production.up.railway.app
```

---

## Database Schema

All IDs are UUID (`gen_random_uuid()`) unless noted. Timestamps are `TIMESTAMPTZ DEFAULT NOW()`.

### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PRIMARY KEY | Only non-UUID ID in the system |
| name | VARCHAR(255) NOT NULL | |
| email | VARCHAR(255) UNIQUE NOT NULL | |
| password | VARCHAR(255) NOT NULL | bcrypt hashed |
| role | VARCHAR(50) NOT NULL | `owner` \| `bar_staff` \| `kitchen_staff` |
| push_token | VARCHAR(500) | Expo push token, nullable |
| active | BOOLEAN DEFAULT true | |
| created_at | TIMESTAMPTZ | |

### `channels`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR(100) UNIQUE | `lumiere_official`, `lumiere_bar_team`, `lumiere_kitchen`, `tova_kitchen` |
| label | VARCHAR(100) | Display name: "Lumiere Official", etc. |
| created_at | TIMESTAMPTZ | |

### `channel_roles`
| Column | Type | Notes |
|--------|------|-------|
| channel_id | UUID FK → channels | |
| role | VARCHAR(50) | Composite PK with channel_id |

### `messages`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| channel_id | UUID FK → channels | |
| user_id | INTEGER FK → users | |
| type | VARCHAR(20) | `text` \| `image` \| `order_ref` |
| content | TEXT | nullable |
| image_url | VARCHAR(500) | Cloudinary URL, nullable |
| order_id | UUID FK → orders | nullable, for order_ref type |
| created_at | TIMESTAMPTZ | |

### `products`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR(255) NOT NULL | |
| active | BOOLEAN DEFAULT true | |
| created_at | TIMESTAMPTZ | |

### `orders`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| type | VARCHAR(20) NOT NULL | `preorder` \| `wholesale` |
| status | VARCHAR(50) DEFAULT 'new' | `new` → `confirmed` → `in_preparation` → `prepared` → `picked_up` / `no_show` / `cancelled` |
| created_by | INTEGER FK → users | |
| edited | BOOLEAN DEFAULT false | |
| last_edited_by | INTEGER FK → users | nullable |
| last_edited_at | TIMESTAMPTZ | nullable |
| payment_status | VARCHAR(50) | preorder: `unpaid` \| `paid` \| `partial` |
| pickup_date | DATE | preorder only |
| pickup_time | VARCHAR(100) | preorder only, stored as "HH:MM:SS" |
| customer_name | VARCHAR(255) | preorder only |
| phone_number | VARCHAR(20) | preorder only |
| notes | TEXT | nullable |
| wholesale_code | VARCHAR(100) | wholesale only |
| due_date | DATE | wholesale only |
| due_time_context | VARCHAR(100) | wholesale: `morning` \| `afternoon` \| `EOD` \| custom |
| no_show_notified | BOOLEAN DEFAULT false | cron job flag |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### `order_items`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| order_id | UUID FK → orders | |
| product_id | UUID FK → products | nullable |
| product_name | VARCHAR(255) NOT NULL | free text (denormalized) |
| quantity | INTEGER NOT NULL | |
| kitchen | VARCHAR(20) | `lumiere` \| `tova`, wholesale only |
| notes | TEXT | nullable |
| created_at | TIMESTAMPTZ | |

### `order_attachments`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| order_id | UUID FK → orders | |
| uploaded_by | INTEGER FK → users | |
| image_url | VARCHAR(500) NOT NULL | Cloudinary URL |
| note | TEXT | nullable |
| created_at | TIMESTAMPTZ | |

### `recipe_categories`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR(100) NOT NULL | |
| created_by | UUID FK → users | |
| created_at | TIMESTAMPTZ | |

### `recipes`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR(255) NOT NULL | |
| kitchen | VARCHAR(20) NOT NULL | `lumiere` \| `tova` \| `both` |
| category_id | UUID FK → recipe_categories | ON DELETE SET NULL |
| ingredients | TEXT | nullable |
| instructions | TEXT | nullable |
| created_by | UUID FK → users | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |
| last_edited_by | UUID FK → users | nullable |
| last_edited_at | TIMESTAMPTZ | nullable |

### `inventory_items`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR(255) NOT NULL | |
| module | VARCHAR(20) NOT NULL | `bar` \| `kitchen` |
| unit | VARCHAR(50) NOT NULL | `units`, `kg`, `liters`, etc. |
| quantity | NUMERIC DEFAULT 0 | |
| low_threshold | NUMERIC DEFAULT 5 | |
| updated_by | INTEGER FK → users | nullable |
| updated_at | TIMESTAMPTZ | |

### `inventory_history`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| item_id | UUID FK → inventory_items | |
| previous_qty | NUMERIC NOT NULL | |
| new_qty | NUMERIC NOT NULL | |
| changed_by | INTEGER FK → users | |
| changed_at | TIMESTAMPTZ | |

---

## API Endpoints

Base URL: `https://lumiere-staff-api-production.up.railway.app`
All endpoints require `Authorization: Bearer <jwt>` unless noted.

### Auth (`/api/auth`)

| Method | Path | Auth | Roles | Body | Response |
|--------|------|------|-------|------|----------|
| POST | /login | No | — | `{email, password}` | `{token, user: {id, name, email, role}}` |
| GET | /me | Yes | All | — | `{id, name, email, role}` |
| PUT | /push-token | Yes | All | `{push_token}` | `{success: true}` |
| DELETE | /push-token | Yes | All | — | `{success: true}` |

### Products (`/api/products`)

| Method | Path | Auth | Roles | Response |
|--------|------|------|-------|----------|
| GET | / | Yes | All | `[{id, name}...]` (active only, ordered by name) |

### Channels (`/api/channels`)

| Method | Path | Auth | Roles | Body | Response |
|--------|------|------|-------|------|----------|
| GET | / | Yes | All | — | `[{id, name, label}...]` (filtered by role) |
| GET | /:id/messages | Yes | All* | `?before=msgId` | `[{id, channelId, senderId, senderName, type, content, image_url, order_id, created_at}...]` (50 per page) |
| POST | /:id/messages | Yes | All* | `{type, content?, image_url?, order_id?}` | Same shape as above |

*Must have channel access via channel_roles

### Orders (`/api/orders`)

| Method | Path | Auth | Roles | Body | Response |
|--------|------|------|-------|------|----------|
| POST | /preorder | Yes | owner, bar_staff | `{payment_status, pickup_date, pickup_time?, customer_name, phone_number?, notes?, items: [{product_id?, product_name, quantity, notes?}]}` | `{...order, items}` |
| POST | /wholesale | Yes | owner | `{wholesale_code, due_date, due_time_context?, notes?, kitchens: [{kitchen, items: [{product_id?, product_name, quantity}]}]}` | `{...order, items}` |
| GET | /calendar | Yes | All | `?view=day\|week\|month&date=YYYY-MM-DD&type=all\|preorder\|wholesale` | `[{id, type, status, pickup_date?, due_date?, customer_name?, wholesale_code?, item_count, created_by: {id, name}}]` |
| GET | /upcoming-noshows | Yes | owner, bar_staff | — | `[{id, customer_name, phone_number, pickup_date, pickup_time, status}]` |
| GET | /:id | Yes | All | — | `{...order, created_by (string), creator_name, last_edited_by_name, items, attachments}` |
| PATCH | /:id | Yes | owner; bar_staff (own) | `{payment_status?, pickup_date?, ...}` | `{...updated}` |
| DELETE | /:id | Yes | owner; bar_staff (own) | — | `{message}` |
| POST | /:id/attachments | Yes | owner, kitchen_staff | multipart: `image`, `note?` | `{id, order_id, uploaded_by, image_url, note, created_at}` |
| PATCH | /:id/status | Yes | Varies | `{status}` | `{...updated}` |

**Status transitions by role:**
- Bar staff: `confirmed`, `picked_up`, `no_show`, `cancelled`
- Kitchen staff: `in_preparation`, `prepared`
- Owner: all statuses

### Recipes (`/api/recipes`)

| Method | Path | Auth | Roles | Body | Response |
|--------|------|------|-------|------|----------|
| GET | /categories | Yes | All | — | `[{id, name, created_by, created_at}]` |
| POST | /categories | Yes | owner, kitchen_staff | `{name}` | `{...category}` |
| GET | / | Yes | All | `?kitchen=lumiere\|tova&category=id&search=text` | `[{...recipe, category_name, creator_name}]` |
| POST | / | Yes | owner, kitchen_staff | `{name, kitchen, category_id?, ingredients?, instructions?}` | `{...recipe}` |
| GET | /:id | Yes | All | — | `{...recipe, category_name, creator_name, editor_name}` |
| PATCH | /:id | Yes | owner; creator | `{name?, kitchen?, ...}` | `{...updated}` |
| DELETE | /:id | Yes | owner; creator | — | `{message}` |

### Inventory (`/api/inventory`)

| Method | Path | Auth | Roles | Body | Response |
|--------|------|------|-------|------|----------|
| GET | / | Yes | All | `?module=bar\|kitchen` | `[{...item, updater_name}]` |
| POST | / | Yes | All | `{name, module, unit, quantity?, low_threshold?}` | `{...item}` |
| PATCH | /:id | Yes | All | `{quantity}` | `{...updated}` (transactional with history) |
| GET | /:id/history | Yes | All | — | `[{...change, changer_name}]` (last 50) |

### Health

| Method | Path | Auth | Response |
|--------|------|------|----------|
| GET | /health | No | `{status: "ok"}` |

---

## Mobile Navigation

```
app/
├── (auth)/login.tsx                    # Email + password login
└── (app)/
    ├── channels/index.tsx              # Channel list (role-filtered)
    ├── channels/[id].tsx               # Chat screen (real-time)
    ├── orders/index.tsx                # Orders list (preorders + wholesale)
    ├── orders/[id].tsx                 # Order detail + status actions
    ├── orders/preorder/create.tsx      # Create preorder form
    ├── orders/wholesale/create.tsx     # Create wholesale form
    ├── calendar/index.tsx              # Day/week/month calendar
    ├── inventory/index.tsx             # Bar/kitchen inventory + inline edit
    ├── recipes/index.tsx               # Recipe list + search + filters
    ├── recipes/[id].tsx                # Recipe detail + copy/share
    ├── recipes/create.tsx              # Create/edit recipe form
    └── settings.tsx                    # Profile + logout (header button, not tab)
```

**Tab bar:** Channels | Orders | Calendar* | Inventory | Recipes
*Calendar hidden for kitchen_staff

**Theme:** Gold primary (#8B6914), dark text (#1A1A1A), cream backgrounds (#FFFDF5)

---

## Auth Flow

1. **Login:** POST `/api/auth/login` → receive `{token, user}`
2. **Store:** Token saved to `expo-secure-store` key `"auth_token"`, user to Zustand
3. **Persist:** On app launch, `loadUser()` reads token from SecureStore → GET `/api/auth/me`
4. **Intercept:** Axios interceptor adds `Authorization: Bearer {token}` to every request
5. **401 handling:** Any 401 response → auto-logout → redirect to login
6. **Logout:** DELETE `/api/auth/push-token` → clear SecureStore → clear Zustand → redirect
7. **Token expiry:** 30 days, no refresh mechanism (user must re-login)

---

## Socket.IO

### Connection
```
Client → connect with {auth: {token}}
Server → verify JWT in middleware → set socket.data.user
```

### Events

| Direction | Event | Data | Purpose |
|-----------|-------|------|---------|
| Client → Server | `join_channel` | `channelId` | Join chat room |
| Client → Server | `leave_channel` | `channelId` | Leave chat room |
| Server → Client | `joined` | `{channelId}` | Confirm room join |
| Server → Client | `new_message` | `{id, channelId, senderId, senderName, type, content, image_url, order_id, created_at}` | Real-time message |
| Server → Client | `order_attachment_added` | `{orderId, imageUrl, note, uploadedBy}` | Photo added to order |
| Server → Client | `error` | `{message}` | Auth/access error |

### Mobile socket helper (`mobile/lib/socket.ts`)
- `getSocket()` — returns connected socket, waits for connection if connecting
- `joinChannel(id)` — emits join_channel
- `leaveChannel(id)` — emits leave_channel
- `disconnectSocket()` — disconnects and nulls reference

---

## Role Permissions Matrix

| Feature | Owner | Bar Staff | Kitchen Staff |
|---------|:-----:|:---------:|:-------------:|
| **Channels** | | | |
| Lumiere Official | ✅ | ✅ | ✅ |
| Bar Team | ✅ | ✅ | ❌ |
| Lumiere Kitchen | ✅ | ❌ | ✅ |
| Tova Kitchen | ✅ | ❌ | ✅ |
| **Orders** | | | |
| Create preorder | ✅ | ✅ | ❌ |
| Create wholesale | ✅ | ❌ | ❌ |
| Edit/delete own order | ✅ | ✅ | ❌ |
| Edit/delete any order | ✅ | ❌ | ❌ |
| Status: confirmed/picked_up/no_show/cancelled | ✅ | ✅ | ❌ |
| Status: in_preparation/prepared | ✅ | ❌ | ✅ |
| Upload attachment | ✅ | ❌ | ✅ |
| View calendar | ✅ | ✅ | ❌ |
| **Inventory** | | | |
| View bar | ✅ | ✅ | ❌ |
| View kitchen | ✅ | ❌ | ✅ |
| Edit quantities | ✅ | ✅ | ✅ |
| **Recipes** | | | |
| View all | ✅ | ✅ | ✅ |
| Create/edit/delete | ✅ | ❌ | ✅ (own only) |
| Create category | ✅ | ❌ | ✅ |

---

## Background Jobs

### No-Show Checker (`backend/src/jobs/noShowChecker.ts`)
- **Schedule:** Every 15 minutes via `node-cron`
- **Logic:** Finds preorders where `pickup_date + pickup_time < now - 30min` AND status = `prepared` AND `no_show_notified = false`
- **Action:** Sends push notification to owner + bar_staff, sets `no_show_notified = true`

---

## File Structure

```
lumiere-app/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Server entry, Express + Socket.IO setup, route registration
│   │   ├── db/index.ts           # pg Pool, SSL config for production
│   │   ├── middleware/
│   │   │   ├── auth.ts           # verifyToken (JWT decode → req.user)
│   │   │   ├── requireRole.ts    # requireRole(...roles) → 403 if not allowed
│   │   │   └── upload.ts         # multer memory storage, 10MB limit
│   │   ├── routes/
│   │   │   ├── auth.ts           # Login, /me, push-token
│   │   │   ├── channels.ts       # Chat messages, socket emit
│   │   │   ├── products.ts       # Product list
│   │   │   ├── orders.ts         # Full CRUD + status + attachments
│   │   │   ├── recipes.ts        # Full CRUD + categories
│   │   │   └── inventory.ts      # CRUD + quantity history
│   │   ├── services/
│   │   │   ├── notifications.ts  # sendPushNotification, notifyByRole, notifyUser
│   │   │   └── cloudinary.ts     # uploadImage (buffer → Cloudinary)
│   │   ├── socket/handlers.ts    # join_channel, leave_channel events
│   │   └── jobs/noShowChecker.ts # Cron: overdue preorder detection
│   ├── sql/
│   │   └── create_recipes_tables.sql
│   └── package.json
│
├── mobile/
│   ├── app/                      # expo-router file-based routing (see Navigation above)
│   ├── lib/
│   │   ├── api.ts                # Axios instance + auth interceptor + 401 handler
│   │   ├── socket.ts             # Socket.IO client helpers
│   │   └── notifications.ts      # Push notification setup + listeners
│   ├── store/
│   │   └── authStore.ts          # Zustand: user, token, login, logout, loadUser
│   ├── components/
│   │   └── chat/OrderCard.tsx    # Order reference card in chat
│   ├── assets/
│   └── package.json
│
├── CONTEXT.md                    # THIS FILE
└── .claude/                      # Claude Code settings + memory
```

---

## Conventions & Patterns

- **Field naming:** snake_case everywhere (DB, API responses, mobile interfaces)
- **ID types:** users.id is INTEGER (SERIAL), everything else is UUID
- **API responses:** Backend transforms DB rows before sending (e.g., `channelId` not `channel_id` in socket messages, `creator_name` as flat field)
- **Error responses:** `{error: "Human-readable message"}` with appropriate HTTP status
- **Auth pattern:** `router.use(verifyToken)` at top of route file, then `requireRole(...)` per endpoint
- **Transactions:** Used for order creation (order + items) and inventory updates (item + history)
- **Image uploads:** Multer → buffer → Cloudinary → URL stored in DB

---

## Known Issues & Technical Debt

### Bugs
- **Chat re-enter to load:** Messages sometimes don't appear until exiting and re-entering the channel. Likely socket timing issue in `getSocket()`.
- **Expo Go notification warning:** Expo Go doesn't support push notifications since SDK 53. Shows warning banner on every app launch. Fixed in dev builds.

### Missing for Production
- [ ] EAS dev build (replaces Expo Go, enables push notifications)
- [ ] Order edit screens (preorder + wholesale) — can only create, not edit
- [ ] Token refresh mechanism (currently 30-day expiry, then re-login)
- [ ] Rate limiting on API endpoints
- [ ] CORS locked to specific origins (currently `*`)
- [ ] Input validation (phone format, email format, field lengths)
- [ ] Redis for Socket.IO (required for multi-server scaling)
- [ ] Structured logging (currently console.log/error)
- [ ] Database migration system (currently manual SQL)
- [ ] Inventory low-stock push notifications

### Data Needed
- [ ] Seed real products into `products` table
- [ ] Seed real recipe categories
- [ ] Add staff user accounts (bar_staff, kitchen_staff)
- [ ] Populate initial inventory items

---

## Testing

### ADB Emulator Testing
```bash
# Emulator
C:\Users\xoxok\AppData\Local\Android\Sdk\emulator\emulator.exe -avd Pixel_7_API_35

# ADB path
C:\Users\xoxok\AppData\Local\Android\Sdk\platform-tools\adb.exe

# Port forwarding (required for local dev)
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3000 tcp:3000

# Screenshot (Git Bash — needs MSYS_NO_PATHCONV=1)
export MSYS_NO_PATHCONV=1
$ADB shell screencap -p /sdcard/screen.png && $ADB pull /sdcard/screen.png ./screen.png

# UI tree dump (find element coordinates)
$ADB shell uiautomator dump /sdcard/ui.xml && $ADB pull /sdcard/ui.xml ./ui.xml

# Tap / type / scroll
$ADB shell input tap <x> <y>
$ADB shell input text "hello"
$ADB shell input swipe 540 1500 540 500 300
```

**Note:** `adb shell input text` does NOT trigger React Native's `onChangeText`. It visually types but React state stays empty. Use clipboard paste or test via API instead.

### API Testing
```bash
# Health check
curl https://lumiere-staff-api-production.up.railway.app/health

# Login
curl -X POST https://lumiere-staff-api-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"eliran@lumiere.com","password":"<password>"}'

# Authenticated request
curl https://lumiere-staff-api-production.up.railway.app/api/orders/calendar \
  -H "Authorization: Bearer <token>"
```

### TypeScript Checks
```bash
cd backend && npx tsc --noEmit    # Backend
cd mobile && npx tsc --noEmit     # Mobile (expect 0 errors)
```

---

## QA Checklist

### Per-Screen Verification

- [ ] **Login** — enter email/password → navigates to Channels → token persisted across restart
- [ ] **Channels** — lists role-appropriate channels → tap into channel → messages load → send message appears in real-time
- [ ] **Orders List** — shows preorders with correct item count → shows wholesale section → FAB opens create menu
- [ ] **Create Preorder** — fill all fields → add items → submit → appears in orders list and calendar
- [ ] **Create Wholesale** — fill all fields → add items per kitchen → submit → appears in list
- [ ] **Order Detail** — shows all fields → status buttons work → attachment upload works → back navigates correctly
- [ ] **Calendar** — Day/Week/Month views switch → orders appear on correct dates → tap order navigates to detail
- [ ] **Inventory** — Bar/Kitchen tabs switch → add item via FAB → edit quantity inline → history shows changes
- [ ] **Recipes** — Lumiere/Tova filter works → search works → create recipe → detail shows → edit works → delete works → copy/share works
- [ ] **Settings** — shows user name/email/role → sign out works → returns to login
- [ ] **Push Notifications** — order status change triggers notification → chat message triggers notification → no-show triggers notification (dev build only)
- [ ] **Offline/Error** — no crash on network error → error states show retry buttons → pull-to-refresh works on all lists

### Cross-Cutting
- [ ] Role-based: kitchen_staff cannot see Calendar tab
- [ ] Role-based: bar_staff cannot create wholesale orders
- [ ] Role-based: kitchen_staff cannot create/edit orders
- [ ] 401 auto-logout works (expire token or use invalid)
- [ ] App survives backgrounding and foregrounding
- [ ] Deep links from push notifications navigate correctly
