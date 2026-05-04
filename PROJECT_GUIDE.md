# MASS Ticketing System — How It Works (Project Guide)

This guide explains **how the project works end-to-end** (what each major file/block does, and how a request flows through the system), so you can explain it to a friend/professor.

## Table of contents
- [Big picture](#big-picture)
- [Tech stack](#tech-stack)
- [Project layout (where things live)](#project-layout-where-things-live)
- [The request “bouncer”: route protection](#the-request-bouncer-route-protection)
- [User flow: Home → Metro → Confirm → Checkout → Success/Receipt](#user-flow-home--metro--confirm--checkout--successreceipt)
- [API endpoints (what each route does)](#api-endpoints-what-each-route-does)
- [Admin area (separate auth + pages)](#admin-area-separate-auth--pages)
- [Database schema (Prisma models)](#database-schema-prisma-models)
- [Seeding stations/fares](#seeding-stationsfares)
- [Key “gotchas” (good to mention in viva/presentation)](#key-gotchas-good-to-mention-in-vivapresentation)

## Big picture
This is a **Next.js App Router** web app where:
- Users can **sign up** and **log in**, then buy a **Metro ticket**.
- The purchase flow is **Home → Metro → Confirm → Checkout → Success/Receipt**.
- Payment is **simulated** (demo accounts), but **transactions are stored in the database**.
- There is a separate **Admin Control** area under `/control/*` to manage **stations + fares**.

## Tech stack
- **Next.js (App Router)**: UI pages in `src/app/*`, API routes in `src/app/api/*`
- **NextAuth v4 (Credentials provider)**: user login sessions
- **Prisma + MySQL/MariaDB**: database access
- **bcrypt**: password hashing/verification
- **pdfkit + qrcode**: PDF receipt generation (server) and QR display (client)
- **Tailwind**: styling

## Project layout (where things live)

### Pages (`src/app/*`) — what users see
- **Home**: `src/app/page.tsx` → `/`
- **Signup**: `src/app/signup/page.tsx` → `/signup`
- **Login**: `src/app/login/page.tsx` + `src/app/login/LoginForm.tsx` → `/login`
- **Metro purchase**: `src/app/metro/page.tsx` → `/metro`
- **Confirm trip**: `src/app/metro/confirm/page.tsx` → `/metro/confirm`
- **Checkout**: `src/app/checkout/page.tsx` → `/checkout`
- **Success**: `src/app/success/page.tsx` + `src/app/success/SuccessClient.tsx` → `/success?transactionId=...`

### API routes (`src/app/api/*`) — server endpoints
- **User auth**
  - NextAuth handler: `src/app/api/auth/[...nextauth]/route.ts`
  - Signup endpoint: `src/app/api/auth/signup/route.ts`
- **Metro**
  - Stations list: `src/app/api/metro/stations/route.ts`
  - Fare calc: `src/app/api/metro/fare/route.ts`
  - Checkout/payment: `src/app/api/metro/checkout/route.ts`
  - Read transaction: `src/app/api/metro/transaction/route.ts`
  - Receipt PDF: `src/app/api/metro/receipt/route.ts`
- **Profile**
  - Current user: `src/app/api/profile/route.ts`
  - Transactions list: `src/app/api/profile/transactions/route.ts`
- **Admin**
  - Login: `src/app/api/admin/login/route.ts`
  - Logout: `src/app/api/admin/logout/route.ts`
  - Require-admin helper: `src/app/api/admin/_auth.ts`
  - Stations CRUD: `src/app/api/admin/metro/stations/route.ts`
  - Fares CRUD: `src/app/api/admin/metro/fares/route.ts`

### Shared library code (`src/lib/*`)
- **DB client**: `src/lib/prisma.ts`
- **User session helper**: `src/lib/session.ts` (wraps `getServerSession`)
- **Admin JWT cookie**: `src/lib/adminAuth.ts` (sign/verify)
- **Fare calculation fallback**: `src/lib/metroFare.ts` (uses JSON segment fares)
- **Client trip draft storage**: `src/lib/tripStore.ts` (localStorage)

### Prisma/DB
- **Schema**: `prisma/schema.prisma` (models: User/Admin/MetroStation/MetroFare/Transaction)
- **Seed script**: `prisma/seed.js` (loads station + fare data)

## The request “bouncer”: route protection
The project protects routes in **two layers**:

### Layer 1: `middleware.ts` (runs before protected routes load)
File: `middleware.ts`

It does two checks:
- **Admin protection** for `/control/*` (and `/admin/*`):
  - If you’re not on `/control/login`, it looks for an `admin_session` cookie.
  - It verifies the cookie using `verifyAdminSession()` from `src/lib/adminAuth.ts`.
  - If missing/invalid → redirect to `/control/login?reason=unauthorized`.
- **User protection** for `/metro/*`, `/checkout/*`, `/success/*`, `/profile/*`:
  - It uses NextAuth’s `getToken()` to check for a valid user session cookie.
  - If missing → redirect to `/login?callbackUrl=...`.

Why this matters:
- You can explain it like a **security guard at the door** that checks cookies before letting you open the page.

### Layer 2 (admin only): server layout check
Admin pages also enforce auth server-side in:
- `src/app/control/(app)/layout.tsx`

It reads cookies on the server (`next/headers`) and redirects if the admin cookie is missing/invalid.

This matters because:
- Even if someone bypassed client navigation, the server still won’t render the admin layout without a valid admin cookie.

## Annotated code blocks (with line ranges)
This section is the “what block does what” reference. When presenting, you can say things like:
- “In `middleware.ts` lines 11–32 we enforce admin protection…”

### `middleware.ts` (global route protection)
File: `middleware.ts`

- **Protected paths list (what requires user login)**: lines **6–6**
  - This list is used later to decide if the request needs a user session.
- **Admin protection block**: lines **11–32**
  - Lines **12–17**: checks if the request is going to `/control/*` or `/admin/*`
  - Line **18**: allows the login pages through without checks
  - Lines **19–27**: reads `admin_session` cookie and tries to verify it
  - Lines **28–31**: builds redirect URL with `callbackUrl` + `reason`
  - Line **31**: redirects unauthorized users to `/control/login`
- **User protection block**: lines **34–46**
  - Lines **34–37**: decides if this path needs a user session
  - Line **38**: if not protected, allow through
  - Lines **40–41**: reads NextAuth token from cookies
  - Lines **43–45**: redirects to `/login` with `callbackUrl` if not logged in
- **Matcher config**: lines **48–59**
  - Only these paths run the middleware (performance + clarity).

### `src/app/api/auth/[...nextauth]/route.ts` (user login via NextAuth Credentials)
File: `src/app/api/auth/[...nextauth]/route.ts`

- **Provider configuration**: lines **13–35**
  - Lines **14–19**: defines credential fields (email/password)
  - Lines **20–33** (`authorize()`):
    - Lines **21–24**: normalize input and reject missing values
    - Lines **26–27**: find user by email (DB lookup)
    - Lines **29–30**: verify password with bcrypt
    - Line **32**: return minimal user identity to NextAuth
- **JWT + session callbacks**: lines **36–51**
  - Lines **37–44**: put user fields into the JWT token on login
  - Lines **45–50**: attach `user.id` onto the session object for server usage
- **Exports**: lines **54–55**
  - NextAuth handler supports both GET and POST.

### `src/app/metro/page.tsx` (metro selection + fare calculation + saving trip draft)
File: `src/app/metro/page.tsx`

- **State setup**: lines **12–18**
  - Holds stations list, input values, computed fare, and error/loading UI states.
- **Block 1 — load stations**: lines **20–43**
  - Lines **21–26**: fetch `/api/metro/stations` and store the list
  - Lines **26–40**: debug logging block (can be ignored for core logic)
- **Block 2 — compute fare on selection**: lines **47–77**
  - Lines **48–50**: reset UI state when stations change
  - Lines **51–58**: validate before calling the API (prevents bad requests)
  - Lines **60–76**: call `/api/metro/fare` and set `fare` or `error`
- **Block 3 — submit**: lines **79–102**
  - Lines **83–98**: final validation (important so you don’t save invalid draft)
  - Line **100**: saves trip draft (`localStorage`) via `saveTripDraft()`
  - Line **101**: navigates to `/metro/confirm`
- **UI form**: lines **104–178**
  - The inputs use a `<datalist>` (lines **145–149**) for station suggestions.

### `src/app/checkout/page.tsx` (payment form → calls checkout API)
File: `src/app/checkout/page.tsx`

- **Trip-draft guard**: lines **25–29**
  - Loads from `localStorage`; if missing, redirects to `/metro`.
- **Validation block**: lines **35–51**
  - Prevents sending incomplete payment info.
- **API call block**: lines **53–77**
  - Lines **54–66**: POST `/api/metro/checkout` with trip + payment fields
  - Lines **69–73**: handle API errors
  - Lines **75–76**: clear draft + redirect to success with `transactionId`

### `src/app/api/metro/checkout/route.ts` (server payment simulation + DB transaction)
File: `src/app/api/metro/checkout/route.ts`

- **Auth guard**: lines **43–48**
  - Uses `getToken()` to confirm the user is logged in.
- **JSON parsing + input normalization**: lines **50–62**
  - Parses request JSON, trims strings.
- **Business validation**: lines **63–78**
  - Checks missing trip details, same station, invalid method, missing payment fields.
- **Server-side fare recompute + anti-tamper check**: lines **79–88**
  - Line **79** recomputes fare from stations (never trust client).
  - Lines **86–88** reject if client-sent fare doesn’t match computed fare.
- **Demo payment validation**: lines **90–109**
  - Checks demo account credentials and balance.
- **Transaction creation**: lines **111–132**
  - Lines **112–115**: create `transactionId` + timestamps (valid for 8 hours)
  - Lines **116–118**: ensure stations exist in DB (upsert)
  - Lines **119–129**: create `Transaction` DB row
  - Line **131**: return `{ ok: true, transactionId }`

### `src/app/success/SuccessClient.tsx` (fetch txn + QR + receipt link)
File: `src/app/success/SuccessClient.tsx`

- **Read `transactionId` from URL**: lines **20–25**
- **Fetch transaction details**: lines **27–42**
  - Calls `/api/metro/transaction?transactionId=...`
- **Generate QR code**: lines **44–57**
  - Builds a text payload and generates a QR image (data URL).
- **Receipt download link**: lines **97–110**
  - Direct link to `/api/metro/receipt?transactionId=...` which returns a PDF.

## User flow: Home → Metro → Confirm → Checkout → Success/Receipt

### 1) Home (`/`)
File: `src/app/page.tsx`
- Shows marketing content + buttons.
- Buttons link to `/metro` (buy ticket) and `/signup` (create account).

### 2) Signup (`/signup`)
File: `src/app/signup/page.tsx`
- Form submits `POST /api/auth/signup`.
- On success, navigates to `/login`.

Server side signup endpoint:
- `src/app/api/auth/signup/route.ts`
- Validates input, checks email uniqueness, hashes password with bcrypt, creates a `User` record.

### 3) Login (`/login`)
Files:
- `src/app/login/page.tsx` (Suspense wrapper)
- `src/app/login/LoginForm.tsx` (actual form)

What happens:
- Calls `signIn("credentials", ...)` (NextAuth credentials provider).
- On success, it **logs out admin** via `POST /api/admin/logout` so admin+user sessions don’t overlap.
- Redirects to `callbackUrl` (defaults to `/metro`).

User auth config:
- `src/app/api/auth/[...nextauth]/route.ts`
- It finds the user by email and runs `bcrypt.compare(password, passwordHash)`.

### 4) Metro purchase page (`/metro`)
File: `src/app/metro/page.tsx`

This page has 3 main blocks:
1) **Load stations list**
   - `GET /api/metro/stations`
2) **Calculate fare when stations change**
   - `POST /api/metro/fare` with `{ startStation, endStation }`
3) **Submit**
   - Saves a “trip draft” to localStorage using `saveTripDraft()` from `src/lib/tripStore.ts`
   - Navigates to `/metro/confirm`

Trip draft exists so the next pages don’t need to keep re-asking for selections.

### 5) Confirm page (`/metro/confirm`)
File: `src/app/metro/confirm/page.tsx`

Main logic:
- Loads trip draft from localStorage (`loadTripDraft()`).
- If missing, it redirects back to `/metro` (so user can’t confirm without picking stations).
- If present, shows start/end/fare and a link to `/checkout`.

### 6) Checkout page (`/checkout`)
File: `src/app/checkout/page.tsx`

Main blocks:
- Loads trip draft (same guard pattern: if missing → redirect to `/metro`).
- User chooses method: `bkash | rocket | card`.
- Submits payment to `POST /api/metro/checkout`.
- If success:
  - clears trip draft (`clearTripDraft()`)
  - navigates to `/success?transactionId=...`

### 7) Success page (`/success`)
Files:
- `src/app/success/page.tsx` (Suspense wrapper)
- `src/app/success/SuccessClient.tsx` (client logic)

What happens:
- Reads `transactionId` from query string.
- Fetches details from `GET /api/metro/transaction?transactionId=...`.
- Generates QR code **client-side** with `qrcode`.
- “Download Receipt” uses a direct link to:
  - `GET /api/metro/receipt?transactionId=...` (returns a PDF)

## API endpoints (what each route does)

### User auth
- **POST `/api/auth/signup`**
  - File: `src/app/api/auth/signup/route.ts`
  - Creates user with hashed password.
- **GET/POST `/api/auth/[...nextauth]`**
  - File: `src/app/api/auth/[...nextauth]/route.ts`
  - NextAuth login handling (credentials provider).

### Metro
- **GET `/api/metro/stations`**
  - File: `src/app/api/metro/stations/route.ts`
  - If DB has active stations → return them
  - Else fallback to `src/data/metroFareTable.json`

- **POST `/api/metro/fare`**
  - File: `src/app/api/metro/fare/route.ts`
  - Validates stations
  - Prefers DB station+fare records when available
  - Else uses `calculateFare()` from `src/lib/metroFare.ts`

- **POST `/api/metro/checkout`**
  - File: `src/app/api/metro/checkout/route.ts`
  - Requires user auth (`getToken`)
  - Validates the request body
  - Recomputes fare server-side (does not trust client)
  - Validates demo payment credentials
  - Creates a `Transaction` in DB with:
    - unique `transactionId`
    - `validTill = createdAt + 8 hours`

- **GET `/api/metro/transaction`**
  - File: `src/app/api/metro/transaction/route.ts`
  - Requires user auth
  - Fetches transaction belonging to the current user
  - Returns start/end station names + fare + timestamps

- **GET `/api/metro/receipt`**
  - File: `src/app/api/metro/receipt/route.ts`
  - Requires user auth
  - Fetches transaction belonging to current user
  - Generates QR code buffer (server-side)
  - Builds a PDF using `pdfkit`
  - Returns `application/pdf` with `Content-Disposition: attachment`

### Profile
- **GET/PATCH `/api/profile`**
  - File: `src/app/api/profile/route.ts`
  - GET returns current user info, PATCH updates name/email
- **GET `/api/profile/transactions`**
  - File: `src/app/api/profile/transactions/route.ts`
  - Lists last 50 transactions for the logged in user

## Admin area (separate auth + pages)

### Where admin UI lives
- Login page: `src/app/control/login/page.tsx` + `ControlLoginForm.tsx`
- Protected admin pages live under: `src/app/control/(app)/*`
  - Admin layout chrome: `src/app/control/(app)/layout.tsx`
  - Dashboard: `src/app/control/(app)/page.tsx`
  - Metro stations page: `src/app/control/(app)/metro/stations/page.tsx`
  - Metro fares page: `src/app/control/(app)/metro/fares/page.tsx`

### Admin authentication model
Admin auth is **not NextAuth**.
- Login sets a cookie: `admin_session`
- Cookie is a JWT signed with `ADMIN_JWT_SECRET`
- Logic:
  - Sign/verify: `src/lib/adminAuth.ts`
  - Login endpoint: `src/app/api/admin/login/route.ts`

Important behavior:
- Admin login **clears NextAuth cookies** (user session), so admin/user sessions are mutually exclusive.

### Admin “bootstrap” behavior (first login)
In `src/app/api/admin/login/route.ts`:
- If `Admin` table is empty, it allows first admin login using `.env` values:
  - `ADMIN_EMAIL`
  - `ADMIN_PASSWORD`
and creates the first admin record automatically.

### Admin APIs
All admin endpoints begin by calling `requireAdmin(req)` from `src/app/api/admin/_auth.ts`.

- **Stations**
  - File: `src/app/api/admin/metro/stations/route.ts`
  - GET: list stations
  - POST: create station
  - PATCH: update station name and/or active status

- **Fares**
  - File: `src/app/api/admin/metro/fares/route.ts`
  - GET: list active stations + fare rows
  - PUT: upsert fare for a station pair, and also upserts the reverse direction

## Database schema (Prisma models)
File: `prisma/schema.prisma`

Main models:
- `User`: login users (email unique, passwordHash)
- `Admin`: admin users (email unique, passwordHash)
- `MetroStation`: stations list with `active` flag
- `MetroFare`: fare between (fromStationId, toStationId)
- `Transaction`: ticket purchase record (transactionId unique, validTill for ticket validity)

When explaining to a professor:
- Point out **relationships**:
  - User → many Transactions
  - MetroStation participates in fares (from/to) and transactions (start/end)

## Seeding stations/fares
Files:
- `src/data/metroFareTable.json`: ordered station list + segment fares
- `prisma/seed.js`: seed script

What seed does:
1) Upserts all stations as active.
2) Computes total fare for every station pair by summing segment fares.
3) Upserts `MetroFare` rows for all pairs.

Why this matters:
- After seeding, fare lookup can be DB-backed (more “real-world”) instead of relying only on the JSON file.

## Key “gotchas” (good to mention in viva/presentation)
- **Two auth systems**
  - Users: NextAuth
  - Admin: custom JWT cookie
  - They are intentionally **mutually exclusive**.
- **Fare is computed server-side on checkout**
  - Client can send a fare, but server recomputes and rejects mismatches (prevents tampering).
- **Trip draft is stored in localStorage**
  - That’s why `/metro/confirm` and `/checkout` redirect you back if you refresh or if storage is empty.
- **PDF receipt is generated server-side**
  - Receipt endpoint streams binary PDF with correct headers.

