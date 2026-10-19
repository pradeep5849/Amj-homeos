# CCTV-20: Local gateway agent (heartbeat-only MVP)

This Node.js 22+ agent runs **on a trusted machine inside the home network**. It sends a fresh Ed25519-signed heartbeat every 30 seconds to the HomeOS server. It **does not connect to cameras, stream video, record footage, or control PTZ**.

## Prerequisites

1. Set up a registered home, issue a one-time enrollment code as a home owner/admin, and pair the gateway's Ed25519 public key using the pairing endpoint. Preserve the matching private key on the local machine only.
2. Protect the private key file with OS permissions; never upload it to the HomeOS server or commit it to Git.
3. Install Node.js 22+ on the gateway machine.

Example key generation for a new gateway (use a secure local machine):

```sh
openssl genpkey -algorithm ED25519 -out gateway-private.pem
chmod 600 gateway-private.pem
openssl pkey -in gateway-private.pem -pubout -out gateway-public.pem
```

Pair the public key using the existing pairing API before running the agent; the pairing request must be signed as specified by `lib/cctv/gateway-pairing-proof.ts`. The enrollment flow is not yet available as a CLI.

```sh
export CCTV_API_BASE_URL=https://YOUR-HTTPS-HOMEOS-HOST
export CCTV_HOME_ID=YOUR-HOME-UUID
export CCTV_GATEWAY_ID=YOUR-ENROLLED-GATEWAY-UUID
export CCTV_PRIVATE_KEY_FILE=/secure/path/gateway-private.pem
node gateway/cctv/agent.mjs
```

The agent retries failed heartbeats, but does not attempt pairing or silently change identity. Production installation needs system-service management, local secret hardening, backoff, rate limits, and logging. No camera passwords or RTSP URLs should be placed in browser-visible configuration.
