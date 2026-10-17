# CCTV-03c — Secure Gateway Pairing Contracts

**Status:** contract and threat-model gate only; pairing endpoints are not enabled.

## Objective
Pair a locally installed CCTV gateway to exactly one AMJ HomeOS home using a short-lived one-time challenge and device-held asymmetric key. Never accept a gateway's self-asserted home identity.

## Registration contract
- Authenticated OWNER / authorized home administrator starts pairing for an existing PENDING CCTV gateway.
- Server generates 256 bits of cryptographic randomness. Store only a keyed digest, not the plaintext token. Expire in 5 minutes; single redemption; limit issuance and failed attempts.
- Bind challenge to gateway id, home id, initiating actor, purpose, issuance time and expiry. Never put challenge in URL query strings, access logs or analytics.
- Gateway creates an asymmetric keypair locally and submits its public key, challenge and proof of possession over TLS. Reject reused challenge, wrong gateway/home, invalid signature, expired request and revoked/suspended gateway.
- In a single database transaction, consume challenge and transition gateway PENDING to ACTIVE with its credential identity; refuse duplicate enrollment and concurrent race winners.
- Never persist private keys or camera passwords in cloud gateway metadata. Store public key fingerprint/certificate identity, credential expiry and rotation metadata.
- Gateway communicates outbound to cloud only; never require opening inbound home router ports.

## Authenticated gateway calls
- Use mTLS or proof-of-possession signed requests with strict clock tolerance, nonce/replay prevention and server-side gateway identity lookup.
- Authorize every operation against registered home and ACTIVE state. Reject revoked/suspended/archived gateways and archived homes.
- Rotate device credentials and invalidate old keys. Revoke immediately on compromise; fail closed for offline/new sessions.
- Gateway device authorization is not a replacement for user authorization on cloud API calls.

## Data exposure constraints
Public management APIs return only gateway id, home id, name, connection type, and lifecycle status. Do not return pairing token, public network endpoints, private addresses, vault secret references, raw certificates or camera stream URLs.

## Threat-model test gates
Verify one-time challenge redemption, concurrent double-spend, cross-home replay, stale timestamp, invalid signatures, certificate rotation, gateway revocation, archived home, API throttling, redacted logs and malicious gateway response. Use mocked devices only; no LAN scanning or streaming in CI.

## Sequencing
1. Review this contract.
2. Add persistent pairing challenge model and audited issuance API with rate limits.
3. Implement cryptographic redemption, replay defense and credential rotation.
4. Only then enable ACTIVE gateway sessions and local device adapters.
