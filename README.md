# AMJ HomeOS

For production-like Node.js/PostgreSQL deployment requirements, Hostinger Business compatibility, environment variables, workers, and the mobile test procedure, see [`DEPLOYMENT.md`](DEPLOYMENT.md).

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

Archiving is a soft visibility control: archived Homes are excluded from normal active lists but remain directly readable by their existing authorized members and support actors. Rooms and memberships are retained, while OWNER-level authorization is still required for management operations.

### Stage 3 protocol-independent devices

Devices belong to a Home, may optionally belong to a same-Home Room, and declare controlled capabilities such as power, brightness, speed, contact, battery, temperature, and humidity. `WIFI`, `ZIGBEE`, and `TUYA` are identity metadata only: Stage 3 implements no discovery, gateway, broker, cloud, or physical transport.

Logical commands (`setPower`, `setBrightness`, and `setSpeed`) validate Home access, declared capability support, writable capability type/range, and archive status before updating stored logical state. Sensor capabilities are read-only. Room deletion safely unassigns Devices rather than deleting them, and normal Device deletion uses soft archive. The dashboard explicitly labels Device state as logical/simulated.

### Stage 4 onboarding and Gateway foundation

The Add Device wizard separates Wi-Fi/BLE, Zigbee Gateway, Tuya, and Gateway paths. Bluetooth capability is checked only after an explicit user gesture. Wi-Fi passwords use password inputs, are submitted only to the selected fail-closed provider contract, cleared from the UI, and are never stored in PostgreSQL or returned by APIs.

Gateways are Home-scoped smart-home bridges with Wi-Fi/Ethernet router uplink metadata; they are not routers. Onboarding sessions expire and use guarded terminal states. Provider-scoped external identities prevent duplicate adoption. Production Web Bluetooth, Zigbee Gateway, and Tuya adapters return `NOT_CONFIGURED`/`REQUIRES_DEVICE_SPEC`; no BLE UUID, GATT write, Zigbee command, MQTT endpoint, Tuya call, or physical-success path exists yet.

The completion flow uses one centralized transition policy mirrored by a PostgreSQL transition trigger. `NOT_CONFIGURED` is persisted as a terminal onboarding status and is also returned with a provider-specific reason code. Test-only providers exercise discovery, pairing, atomic canonical `Device` registration, and provider identity creation; their constructors reject every non-test runtime. The dashboard wizard includes controlled Wi-Fi, Zigbee, Tuya, Gateway, cancellation, and Room/Unassigned paths. Production never selects a test adapter.

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

### Stage 5 Scenes and Automation Rules

Scenes contain deterministic ordered actions and execute through the same validated logical Device command service used by direct commands. Automations support only `MANUAL` and trusted `DEVICE_STATE` triggers, controlled typed operators, ordered logical actions, correlation IDs, per-chain deduplication, and a maximum chain depth of five. Scene and Automation definitions are soft-archived; execution history is retained with restrictive foreign keys and honest success, partial-failure, or failure status. PostgreSQL guards prevent cross-Home trigger/action targets.

Stage 5 changes logical HomeOS Device state only. Physical Wi-Fi BLE, Zigbee, and Tuya providers remain `NOT_CONFIGURED`; future physical transports will use this same command interface. No scheduler, geofence, webhook, voice, MQTT, or hardware transport is included.

### Stage 6 scheduling, solar time, timers, and notifications

Automation schedules support controlled `ONCE`, `DAILY`, `WEEKLY`, `SUNRISE`, and `SUNSET` rules. Home IANA timezone is authoritative; stored occurrences are UTC. Local-time conversion selects the first valid occurrence after `now`; spring-forward nonexistent wall times normalize to the first representable instant and fall-back ambiguous wall times use the earlier occurrence, while persisted `nextRunAt` prevents duplicate execution. Solar calculation is deterministic and local—no weather service is called.

The `scheduler:once` CLI claims due work with PostgreSQL `FOR UPDATE SKIP LOCKED`, UUID claim tokens, and a 15-minute stale-claim recovery lease. An occurrence is never automatically retried after a recorded terminal failure. Timers reuse the logical Device command or Scene service, and schedules reuse the Automation engine. In-app notification feeds are private to the authenticated user; no email, SMS, push vendor, WhatsApp, hardware transport, or public scheduler endpoint is included.

### Stage 7 presence, geofencing, and mobile notification foundation

Presence is scoped per user and Home (`HOME`, `AWAY`, `UNKNOWN`) and requires membership. Household presence is derived: any `HOME` means `ANYONE_HOME`; all members explicitly `AWAY` means `EVERYONE_AWAY`; otherwise it is `UNKNOWN`. Location reports require the authenticated user's active random installation client, use server-side Haversine distance, a 50m-or-20% exit hysteresis margin, and ignore proof from accuracy worse than 250m. Exact coordinates are evaluated in memory and never persisted or returned; audit records retain only accuracy and `INSIDE`/`BOUNDARY`/`OUTSIDE` bands.

Mobile push tokens are encrypted only when a deployment supplies a 32-byte secret key and are excluded from every API projection. FCM, APNs, and Web Push providers fail closed as `NOT_CONFIGURED`; test delivery is guarded by `NODE_ENV=test`. No background GPS, vendor push SDK, map/history tracking, BLE, Zigbee, or Tuya transport is implemented.

## Stage 8 — telemetry, energy, and device health

Stage 8 accepts telemetry and heartbeats only through the trusted server-side `ingestTelemetry` and `ingestHeartbeat` services. Production never fabricates readings; the deterministic producer is guarded to `NODE_ENV=test`. Controlled bounds are: power/energy 0–10,000,000, voltage 0–10,000, current 0–100,000, temperature −100–200 °C, humidity/battery 0–100%, and RSSI −200–0 dBm. W is instantaneous power; Wh is energy. Each accepted `ENERGY_WH` sample is an interval quantity; providers exposing cumulative meters must convert consecutive readings to nonnegative interval deltas before ingestion. Provider interval-energy samples are measured, while trapezoidal power integration (with one-hour maximum sample gaps) is explicitly estimated rather than billing-grade.

Health begins as `UNKNOWN`; trusted activity marks a device `ONLINE`, battery at or below 20% marks it `DEGRADED`, and the health worker marks previously observed devices `OFFLINE` after 15 minutes. Status-change-only notifications prevent repeated worker alerts. Raw telemetry is retained for 90 days in bounded batches; daily Home-timezone aggregates are retained. `health:once`, `telemetry:aggregate`, and `telemetry:retention` are private CLI workers with no public ingestion/worker endpoint.

### Stage 9 — Home sharing and invitations

Home OWNERs and the existing trusted support policy can create Home-scoped `MEMBER` invitations. Each invitation uses a cryptographically random 256-bit token returned once to its authorized creator; PostgreSQL stores only its SHA-256 digest. List, audit, notification, and history projections never contain the raw token or digest. Acceptance and rejection require an authenticated account whose normalized email matches the invitation plus possession of the token. Acceptance atomically claims the pending, unexpired invitation and creates the unique Home membership, preventing replay and concurrent duplicates.

Invitation states are `PENDING`, `ACCEPTED`, `REJECTED`, `CANCELLED`, and `EXPIRED`. Every use checks `expiresAt` directly; the optional `invitations:expire` worker records deterministic expiration audit events. Existing and newly registered users use the same authenticated proof flow, and separate Home memberships preserve multi-Home isolation. Managers may remove only `MEMBER` memberships; PostgreSQL protects membership Home scope and the last `OWNER`. Ownership transfer is not implemented in Stage 9.

Invitation email delivery is `NOT_CONFIGURED` and is not implemented. The creator must deliberately transfer the one-time displayed token out of band. SMS and WhatsApp are not implemented. FCM, APNs, Web Push, Wi-Fi/BLE, Zigbee, and Tuya remain fail-closed or outside Stage 9; no hardware provider or external webhook was added.

### Stage 10 — security, audit, and account hardening

Authenticated users can change their password, inspect a privacy-minimal active-session list, revoke another session, revoke all other sessions, and read their controlled security activity. Password changes verify the current bcrypt password, retain only the initiating session, create an in-app security notification, and never expose credentials or session token hashes. Account APIs derive the user exclusively from the authenticated session.

Login abuse protection is PostgreSQL-backed and normalized by email: five failures within 15 minutes lock that identifier for 15 minutes, concurrent increments use one atomic upsert, success clears the state, and every denial remains the generic `Invalid email or password`. Controlled security events cover login success/failure, logout, password changes, and session revocation. Home management activity reuses the Stage 9 audit rather than duplicating it; OWNER and existing trusted support access follow `homeAccess`, while MEMBER and cross-customer access are denied.

Security and Home activity audit retention is 365 days. `audit:retention` deletes at most 1,000 old rows per category per run and does not delete sessions, memberships, notifications, telemetry, presence, or execution history. No IP, User-Agent, device fingerprint, OAuth, MFA, passkey, external email/SMS/WhatsApp provider, physical transport, or provider credential is added in Stage 10.

## Stage 11 — AMJ HomeOS product experience and branding

Stage 11 presents the existing platform as the responsive **AMJ HomeOS** customer web application by AMJ Consterior Solutions. Its authenticated application shell uses a persistent desktop sidebar and touch-friendly mobile navigation for Home, Rooms, Devices, Scenes, Automations, Energy, Presence, Notifications, Family, and Security. A server-authorized Home list powers the shell's multi-Home selector; selecting a Home changes only UI context and never grants access.

The small design system in `app/globals.css` defines AMJ navy, warm gold, accessible semantic status colors, surfaces, typography, focus treatment, cards, inputs, buttons, badges, empty states, and responsive breakpoints. `app/components/brand.tsx` intentionally contains an isolated temporary text lockup because no approved production geometric AMJ asset was supplied. Replace that component with the approved undistorted SVG/PNG mark when available; no competing or guessed logo is used. Web-app metadata supplies the AMJ HomeOS name and theme without a service worker, authenticated-response caching, or an unsupported icon.

The experience is mobile-first and verified at 360×800 and 390×844, plus 1440×900 desktop. Device cards expose only canonical declared controls and label changes as **logical HomeOS state**. Logical updates never imply that a physical command succeeded. Unknown health and unavailable energy remain explicit rather than becoming fake online status or zero usage. Exact coordinates, detailed location history, invitation hashes, session tokens/digests, and push tokens are excluded from customer surfaces.

All physical and external delivery providers remain honest and fail closed: Wi-Fi/BLE provisioning, Zigbee, Tuya, FCM, APNs, Web Push, Android/iOS background location, email, SMS, and WhatsApp are `NOT_CONFIGURED`. AMJ HomeOS remains protocol-independent; Stage 11 adds no hardware transport, Home Assistant dependency, MQTT transport, provider credential, or billing-grade energy claim.

Stage 11 verification adds:

```bash
DATABASE_TEST_URL=postgresql://... npm run test:http:stage11
npm run typecheck
npm run lint
npm test
npm run build
npm audit --omit=dev
```

The Stage 11 HTTP suite requires a fresh disposable PostgreSQL database and Playwright Chromium. It validates the authenticated shell, authorization boundaries, multi-Home isolation, privacy-safe projections, capability-aware controls, honest unavailable states, and responsive no-overflow rendering with screenshots in `artifacts/`.
