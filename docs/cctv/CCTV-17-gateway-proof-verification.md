# CCTV-17: Gateway proof verification

`POST /api/v1/homes/{homeId}/cctv-enrolled-gateways/{gatewayId}/verify`

Request: `{ "challenge": "<base64url-32-byte-challenge>", "signature": "<base64url-64-byte-Ed25519-signature>" }`

The endpoint checks that the enrolled gateway is ACTIVE in the specified home, atomically consumes a matching, unexpired challenge via conditional `updateMany`, and validates an Ed25519 signature over the domain-separated home/gateway/challenge message. Invalid signatures consume their challenge; replay is rejected. The endpoint returns only `{ "verified": true }` on success and never issues an access token or streaming entitlement.

**Important:** This is proof-of-key-possession, not a reusable authentication session. No camera access, heartbeat permission, or streaming access is granted. Production must add IP/edge rate limiting, pairing-code redemption, authenticated gateway operations, audit logs, and secure agent deployment. Gateway revocation must be enforced on every protected operation.
