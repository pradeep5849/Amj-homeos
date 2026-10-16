# HA-01 — AMJ Universal Hub / Home Assistant provisioning contract

Status: **architecture and implementation contract only** (not a working provisioner).  
Product: AMJ HomeOS / RUVEXA. First permanent integration: Home Assistant.  
This document must not be interpreted as a completed hardware integration.

## Locked product boundaries

- One AMJ Universal Hub per customer installation, running AMJ HomeOS Local and Home Assistant on the same device.
- AMJ HomeOS Cloud manages tenants, accounts, hub enrollment and remote connectivity. RUVEXA is the sole normal customer UI.
- Home Assistant is a permanent integration; future Tuya-direct, AMJ-native and other adapters are **additive**, not replacements.
- The hub is a separate trusted security boundary; never expose Home Assistant admin credentials or its API tokens to RUVEXA, browsers, customers or AMJ Cloud.
- Each physical device has one canonical AMJ device ID, one selected command owner, and optionally multiple read-only discovery observations.

## Provisioning states

`UNCLAIMED -> CLAIMED -> HA_INSTALLING -> HA_INITIALIZING -> HA_READY -> ADAPTER_READY -> COMMISSIONED`

Failure states: `NEEDS_ATTENTION`, `REPAIR_REQUIRED`, `DECOMMISSIONED`. Each transition must be persisted, idempotent, auditable and retry-safe.

1. Factory image contains hub agent, supported Home Assistant runtime, local database and no reusable customer secrets.
2. Installer authenticates to AMJ installer interface and claims a **single-use**, short-lived hub pairing challenge over a secure local channel.
3. AMJ Cloud assigns immutable tenant/site/hub identifiers. The hub verifies the claim using device identity and pins ownership locally.
4. A privileged **local provisioning service** initializes Home Assistant via a supported, version-pinned setup mechanism. It creates the initial Home Assistant owner credential **locally** and stores it only in an encrypted hub secret store; the credential is not transmitted to cloud or shown in the customer UI.
5. Provisioning service establishes a dedicated authenticated API connection to Home Assistant (REST and WebSocket). Token generation must use a supported, documented mechanism; **do not assume that arbitrary owner accounts or long-lived tokens can be created through an undocumented API**. If unattended creation is not supported for the selected HA distribution/version, provide a local installer-assisted setup step rather than bypassing authentication.
6. Hub adapter discovers entities, maps stable IDs and capabilities to AMJ canonical devices, subscribes to state changes and supports validated command execution.
7. Installer commissions integrations/devices. Customers then use RUVEXA only.

## Credential and security requirements

- Unique HA owner and adapter credentials per hub; no shared default passwords or hard-coded tokens.
- HA HTTP/WebSocket endpoints bind to a private local interface; firewall prohibits WAN exposure.
- Separate privileged provisioning daemon from unprivileged hub adapter.
- Encrypted-at-rest secrets; least privilege, credential rotation, recovery, revoke-on-decommission, backup encryption and restore ownership verification.
- Hub-cloud mutual authentication; explicit tenant and home authorization for every command; replay resistance and command audit.
- No HA login or API token in the mobile app. RUVEXA authenticates to AMJ HomeOS.
- Home Assistant licensing, integration licensing and trademarks require release review.

## Runtime contracts

Hub adapter API (internal; provisional):
- `listDevices(homeId)` returns canonical capability-scoped device records.
- `subscribeStates(homeId, cursor)` streams ordered updates and supports resynchronization.
- `executeCommand(homeId, deviceId, command, idempotencyKey)` returns accepted/confirmed/failed with correlation ID.
- `getHealth()` reports adapter availability, HA connection and software version.
- `reconcile()` handles discovery changes, duplicate entities and integration restarts.

Home Assistant transport:
- REST API for targeted state/service operations; WebSocket for subscriptions.
- Do not treat an optimistic state update as physical actuation success.
- Maintain a stable mapping between AMJ canonical device IDs and HA entity/device registry IDs; handle entity renames and replacements.
- HA is authoritative for HA-controlled local device state and HA-side automation execution; avoid executing duplicate cloud automations.
- Other adapters can coexist; command ownership is exclusive per canonical physical device.

## Offline and recovery

- LAN RUVEXA-to-hub access and hub-local automation must work without cloud connectivity.
- KNX switches must continue operating independently of hub availability where installation permits.
- HA or hub-agent restart must reconcile state, avoid replaying non-idempotent commands and preserve configuration.
- Backups must cover hub mapping, Home Assistant config, adapter settings and encrypted secrets; restore must verify site ownership.
- Never expose a default HA port to the internet for remote access; use AMJ secure hub-cloud relay/tunnel design.

## Implementation gates (not yet complete)

- **HA-00** Audit current repo models, API auth, commands, automation engine and deployment.
- **HA-01A** Choose supported hub OS/HA installation method and supported bootstrap flow; document versions.
- **HA-01B** Implement hub identity, local claim and secure secret storage.
- **HA-01C** Implement supervised HA initialization and per-hub authenticated adapter.
- **HA-01D** Implement discovery, state synchronization, command translation and duplicate-device resolution.
- **HA-01E** Implement LAN RUVEXA access, secure cloud remote channel and installer commissioning.
- **HA-01F** Verify power-cycle recovery, offline operation, tenant isolation, credential rotation and real devices.

## Acceptance gates

No claim of automatic account creation until a real supported HA version has been provisioned end-to-end. No claim of device control until confirmed with physical hardware. No main-branch merge until code, security review, tests and CI are green.
