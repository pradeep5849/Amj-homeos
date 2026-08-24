# AMJ HomeOS

AMJ HomeOS Stage 1 is the secure SaaS account foundation for a future home-management platform. Stage 1 deliberately contains no homes, rooms, devices, protocols, automations, billing, or installer hierarchy.

## SaaS hierarchy

```text
ONE SUPER ADMIN
       ↓
MANY ADMINS
       ↓
MANY HOME OWNERS PER ADMIN
```

- The single platform **Super Admin** creates, lists, activates, and manages Admins and can view every Home Owner.
- An **Admin** creates and views only its assigned Home Owners. Server-side authorization prevents cross-Admin access.
- A **Home Owner** belongs to exactly one Admin and can access only its own permitted information.

There is no public Admin or Super Admin registration endpoint.

## Default AMJ Admin and direct registration

`AdminProfile.isDefaultAdmin` explicitly identifies the default AMJ Admin; identity never depends on an email, name, or creation order. PostgreSQL permits at most one default Admin and requires that Admin to be active.

Public registration accepts only name, email, and password. The server finds the active default Admin, creates a `HOME_OWNER`, assigns it to that Admin, and starts a secure session. A customer cannot choose an Admin. Registration fails safely when no active default exists. Changing the default is a serializable Super Admin transaction, so subsequent registrations use the new default.

## Stack

- Next.js App Router, React, and strict TypeScript
- PostgreSQL and Prisma migration history
- Zod request and environment validation
- bcrypt password hashing
- Hashed, database-backed session tokens in HTTP-only cookies
- Vitest and ESLint

## Installation

Requirements: a supported Node.js release, npm, and PostgreSQL.

```bash
npm ci
cp .env.example .env
```

Set `DATABASE_URL` to a dedicated development PostgreSQL database and replace every example secret. `.env` is ignored and must never be committed. No secret uses a `NEXT_PUBLIC_` variable.

Apply the checked-in migration and generate the Prisma client:

```bash
npx prisma migrate deploy
npx prisma generate
```

## Super Admin bootstrap

Set `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, and `SUPER_ADMIN_NAME`, then run:

```bash
npm run bootstrap
```

The script creates the first Super Admin only when none exists. PostgreSQL independently prevents a second one. After signing in, the Super Admin creates the first Admin with `isDefaultAdmin: true` through `POST /api/v1/admins`. Never place real bootstrap credentials in source control.

## API

All endpoints use the `/api/v1` namespace:

| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/v1/auth/register` | Public; Home Owner only |
| POST | `/api/v1/auth/sign-in` | Public |
| POST | `/api/v1/auth/sign-out` | Session |
| GET | `/api/v1/auth/me` | Authenticated |
| POST | `/api/v1/admins` | Super Admin |
| GET | `/api/v1/admins` | Super Admin |
| PATCH | `/api/v1/admins/:id` | Super Admin |
| POST | `/api/v1/home-owners` | Admin; assigned to itself |
| GET | `/api/v1/home-owners` | Role-scoped |
| GET | `/api/v1/home-owners/:id` | Owner/Admin-scoped or Super Admin |

API responses omit password hashes and session token hashes.

### Stage 2 homes, memberships, and rooms

The `/api/v1/homes` routes provision and list Homes; nested `rooms` and `members` routes manage authorized Rooms and memberships. Admins provision Homes atomically for Home Owners assigned to them, and the target receives an `OWNER` membership. One account can access multiple Homes.

Platform roles and Home roles are separate. `HOME_OWNER` remains the customer/account-holder role, while `HOME_USER` is an ordinary family or caretaker account. Home memberships independently use `OWNER` and `MEMBER`.

An OWNER can add an existing active `HOME_USER` (or intentionally shared `HOME_OWNER`) by user ID, always as `MEMBER`. Alternatively, `POST /api/v1/homes/:homeId/members/accounts` atomically creates a password-hashed `HOME_USER` and its `MEMBER` membership. The endpoint is OWNER-authorized, fixes both roles server-side, and creates no Admin or Home Owner profile. Public registration remains HOME_OWNER-only.

## Database guarantees

The initial migration adds partial unique indexes and triggers beyond Prisma's relation model. They enforce one Super Admin, at most one default Admin, an active default Admin, immutable roles, role-correct Admin/Home Owner profiles, unique session hashes, and restrictive deletion for Admins with assigned Home Owners. Normalized email is unique.

## Development and verification

```bash
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
npx prisma format --check
npx prisma validate
npx prisma generate
npm audit
```

For a disposable PostgreSQL database, apply migrations to it, set `DATABASE_TEST_URL`, and run `npm run test:db`. Never point integration tests at an unknown or production database.

## Stage 2 limitations

Stage 2 adds Homes, Home memberships, Rooms, and their authorization only. Devices, Wi-Fi, Zigbee, Zigbee2MQTT, MQTT, Tuya, Bluetooth, Home Assistant, scenes, automation, schedules, notifications, subscriptions, and billing remain intentionally deferred.
