# CCTV-03 — Secure live streaming integration plan

Current implementation: **fail-closed readiness endpoint only**. No gateway is enrolled and no media streaming, camera discovery, playback, or PTZ is operational.

## Gateway trust and transport

1. Enroll a home-local agent with a one-time, authenticated owner-issued enrollment code. Bind agent identity to homeId, unique key pair, and revocable device registration. Never treat a supplied homeId as proof of ownership.
2. Establish outbound-only agent-to-cloud mTLS or equivalent mutually authenticated channel. Agent verifies cloud endpoint and tenant identity; cloud validates enrolled agent identity, home scope, freshness and revocation.
3. Camera credentials remain in an encrypted vault accessible only to the enrolled home agent, not in browser responses. Bind camera to explicit enrolled agent and approved destination; never accept arbitrary RTSP/HTTP URLs from browser requests.
4. Discover ONVIF devices only on configured home-local interfaces with bounded timeouts, port restrictions, per-home rate limits and user approval before adding a device. Never probe from the cloud host into arbitrary private or public IPs.
5. Implement browser-compatible WebRTC live media via authenticated gateway; HLS fallback only after confirming resource limits. Use short-lived home/camera-scoped playback tickets, single-purpose authorization and revocation. Prevent cross-home media access.
6. Handle unsupported cameras, offline agents, camera offline, expired tokens, reconnect/backoff and credential rotation with explicit error states.
7. Audit enrollment, agent revocation, stream session issuance and access failures without passwords, stream URLs or tokens in logs.

## Acceptance criteria before marking live view functional

- Home owner can enroll/revoke an agent, bind cameras and rotate credentials.
- Unauthorized and cross-home access tests pass, including guessed cameraId and expired/revoked stream ticket.
- SSRF tests demonstrate blocked metadata endpoints, loopback/cloud private networks, DNS rebinding and unapproved camera targets.
- End-to-end media verified on at least one real ONVIF/RTSP camera and one NVR channel; compatibility is model-specific.
- Browser receives no raw RTSP URL, device password, vendor token or internal secret reference.
- Recording/PTZ remain disabled until separately tested and authorized.
