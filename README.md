## MASS Ticketing System (Next.js)

Web app for **Home → Metro ticket purchase → Checkout → Success/Receipt** and **Bus booking (with seat holds)** with:
- **Real signup/login** (NextAuth Credentials + bcrypt)
- **Real database** (MySQL + Prisma)
- **Simulated payment** (demo accounts), but **transactions are stored in DB**

## Project guide (how it works)
See `PROJECT_GUIDE.md` for an end-to-end explanation of the code structure, request flow, auth, DB models, and key routes.

## Getting Started

### Prerequisites
- Node.js (LTS) + npm
- MySQL Server (or MariaDB). If you already have **XAMPP**, you can use its MySQL + phpMyAdmin.

### 1) Install dependencies

From the project folder (the one containing `package.json`):

```powershell
npm install
```

### 2) Create `.env`

Create a file named `.env` in the project folder (or copy `.env.example` if you have one). Minimum required:

```env
DATABASE_URL="mysql://root@localhost:3306/mass_ticketing"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="dev-change-me"

ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="admin-password"
ADMIN_JWT_SECRET="dev-admin-jwt-secret"
```

- **Important**: Update `DATABASE_URL` to match *your* MySQL username/password/port.
  - XAMPP commonly uses **port 3306** and `root` with **no password** (shown above).
  - If your `root` user has a password, use:

```env
DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/mass_ticketing"
```

### 3) Start MySQL

You need a running MySQL/MariaDB server and a database named `mass_ticketing`.

#### Option A: Use your local MySQL/MariaDB install

- Ensure the server is running
- Create the DB once:

```sql
CREATE DATABASE mass_ticketing;
```

If you’re using XAMPP, you can do the same from phpMyAdmin:
- Open phpMyAdmin → SQL tab → run the command above.
#### Option B: Use Docker (recommended if you have Docker Desktop)

```powershell
docker run --name mass-ticketing-mysql ^
  -e MYSQL_ROOT_PASSWORD=password ^
  -e MYSQL_DATABASE=mass_ticketing ^
  -p 3306:3306 ^
  -d mysql:8
```

Then keep `DATABASE_URL` as:

```env
DATABASE_URL="mysql://root:password@localhost:3306/mass_ticketing"
```

### 4) Run migrations

```powershell
npx prisma migrate dev
```

### 5) Generate Prisma client

If you update `prisma/schema.prisma`, regenerate Prisma Client types:

```powershell
npx prisma generate
```

### 6) Seed initial data (recommended)

This loads:
- Metro: `src/data/metroFareTable.json` → stations + fares
- Bus: operators/buses/seat layouts + starter routes + demo trips + initial seat states

```powershell
npm run seed
```

### 7) Run the app

```powershell
npm run dev
```

Open `http://localhost:3000`.

## Admin login

- Admin panel lives under `/control/*`
  - **Login**: `/control/login`
  - **Dashboard**: `/control`
- **First admin login bootstraps from `.env`** (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) if no admins exist yet.

## How to test the full flow

1) Go to `/signup` and create an account
2) Login at `/login`
3) Go to `/metro`
4) Pick Start + End stations (autocomplete) and confirm
5) Checkout at `/checkout`
6) You’ll land on `/success` with a **QR code** and a **Download Receipt** button

## Bus booking (intercity) flow

1) Login at `/login`
2) Go to `/bus`
3) Choose route + date → select a trip
4) Pick seats on `/bus/seats?tripId=...`
5) Click **Hold seats & continue** → `/bus/checkout`
6) Complete demo payment → `/bus/success?bookingRef=...`

### Seat hold rules
- Seats are held for **15 minutes** after selection.
- A small countdown popup appears (bottom-right) while a hold is active.
- If time expires before payment, seats return to the pool automatically.

## Demo payment credentials

Use one of these on the Checkout page:
- **bKash**: account `01700000000`, PIN `1234`
- **Card**: number `4111111111111111`, CVV `123`

If you enter different credentials, the API returns an error (to mimic “invalid account details”).

## Useful routes

- **Home**: `/`
- **Signup**: `/signup`
- **Login**: `/login`
- **Admin login**: `/control/login`
- **Admin dashboard**: `/control`
- **Bus booking**: `/bus`
- **Bus checkout**: `/bus/checkout`
- **Metro purchase**: `/metro`
- **Confirm**: `/metro/confirm`
- **Checkout**: `/checkout`
- **Success**: `/success?transactionId=...`

## Admin panel notes

- Admin is a **separate area** under `/control/*`.
- Admin and user sessions are **mutually exclusive**:
  - Signing into admin clears the user (NextAuth) session cookies.
  - Signing into a user clears the admin session cookie.

## Troubleshooting

### Prisma can’t reach database (P1001)
- Make sure MySQL is running.
- Make sure `DATABASE_URL` matches your MySQL connection info.
- If you used Docker above, ensure the container is running and port **3306** is free.

### Prisma auth failed (P1000)
This usually means the `DATABASE_URL` password does not match your MySQL user.

- If you’re on **XAMPP** and can open phpMyAdmin without typing a MySQL password, try:

```env
DATABASE_URL="mysql://root@localhost:3306/mass_ticketing"
```

- If your `root` has a password, use it in the URL:

```env
DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/mass_ticketing"
```

### Metro page redirects to login
That’s expected: `/metro`, `/checkout`, `/success` are protected by `middleware.ts`.

### Admin pages redirect to admin login
That’s expected: `/control/*` is protected by admin auth. If you’re not signed in as admin, you’ll be redirected to `/control/login`.

### Port conflicts
- If port `3000` is taken, Next.js will prompt for another port.
- If port `3306` is taken, change the Docker `-p` port mapping (or your local DB port) and update `.env DATABASE_URL` to match.

## Tech stack
- Next.js (App Router) + Tailwind
- Prisma + MySQL
- NextAuth Credentials + bcrypt

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
