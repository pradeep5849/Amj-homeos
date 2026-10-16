# AMJ Gateway Activation — Security and Deployment Contract

## State machine
`unclaimed → activation_pending → active → suspended` (with pending cancellation and suspended reactivation). The state module is deliberately **not** connected to an HTTP activation endpoint. Its `active` value must not be used to grant access until gateway ownership and cryptographic authorization are implemented.

## Storage
The module uses a single-writer atomic rename on a private local volume. Callers must provide an absolute, gateway-controlled file path and ensure the parent directory is writable only by the gateway service. The Docker service runs as the unprivileged `node` user; **provision the mounted `./data/gateway` directory with the correct ownership and restrictive permissions before using this module**. A bind mount alone does not solve UID/GID permissions. Do not use this state file for secrets.

## Mandatory gates before enabling activation
1. Generate unique per-gateway identity and cryptographic keys on device; do not use a shared fleet-wide API key.
2. Require a physically confirmed installer onboarding window and a time-limited one-time challenge.
3. Verify customer account and gateway ownership against AMJ's trusted service, with an offline ownership policy explicitly defined.
4. Encrypt and authenticate any LAN/hotspot setup transport. Keep the development HTTP service bound to host loopback.
5. Authenticate and authorize every state transition; enforce idempotency and replay protection.
6. Serialize writes and compare revision under concurrency; the current file module assumes **one writer** and does not implement cross-process locking.
7. Add security event logs, secure factory reset and recovery, ownership transfer, credential rotation and device revocation.
8. Add integration tests including power-loss, read-only filesystem, volume ownership and restart scenarios.

**Do not represent this state foundation as customer-ready activation.**
