# CCTV-16 Gateway challenge issuance

`POST /api/v1/homes/{homeId}/cctv-enrolled-gateways/{gatewayId}/challenge` issues a 256-bit, one-minute, one-time challenge for an ACTIVE gateway bound to the specified home.

The route stores only a domain-separated SHA-256 digest, limits outstanding challenges to three per gateway, and locks the gateway row while checking the limit to prevent concurrent bypass. It does not authenticate the requesting client: challenges are non-secret and do not grant gateway privileges.

**Before production use:** Configure edge/IP-based rate limits and abuse detection. An attacker who knows a gateway ID can fill the three outstanding challenge slots for up to one minute; gateway clients should retry with backoff. Do not treat challenge issuance as proof of identity.

**Still required:** Verify an Ed25519 signature over the issued challenge, atomically consume the digest only once, check ACTIVE state at verification time, and enforce replay-resistant authentication on every subsequent gateway operation. Pairing-code redemption and real video streaming are not yet implemented.
