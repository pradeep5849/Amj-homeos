# CCTV-12: Enrollment code issuance

POST `/api/v1/homes/{homeId}/cctv-gateway/enrollment-code` requires an authenticated home owner or authorized admin. A 256-bit random code is returned once with a 10-minute expiry. Only its peppered SHA-256 hash is persisted. Any earlier unconsumed, unrevoked, unexpired codes for that home are revoked in the same database transaction.

## Deployment requirements
Set `CCTV_GATEWAY_ENROLLMENT_PEPPER` to a strong independently generated server-side secret (at least 32 characters). Do not expose it to browsers, log it, or commit it. Enrollment-code issuance fails closed with HTTP 503 when missing. Responses are no-store.

## Security work still required before enabling actual pairing
- Build a separately authenticated agent enrollment endpoint with proof of possession of its private key.
- Atomically consume the code in a conditional update, bound to the correct home, expiration and revocation state.
- Add explicit rate limiting for issuance and redemption, security audit events, and concurrency tests.
- Authenticate subsequent gateway heartbeats/requests with signed timestamps and nonces, enforce revocation, and bind approved camera IDs.
- Never treat possession of a code alone as permission to stream, access cameras, or register arbitrary targets.
- Provision a local gateway and validate ONVIF/RTSP integration on real equipment.

This PR does **not** implement code redemption, gateway authentication, or video streaming.
