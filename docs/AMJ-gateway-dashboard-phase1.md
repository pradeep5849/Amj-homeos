# AMJ HomeOS Gateway Dashboard — Phase 1

## Current scope
The local gateway service serves the AMJ-branded landing page at `/` and `/gateway`.
The page fetches `GET /v1/gateway/info` from the same local origin and renders a read-only capability overview.

- No Home Assistant administrative interface is embedded.
- No device commands, tokens, Wi-Fi passwords, serial numbers, or account information are rendered.
- Device commissioning, camera integrations, activation, and Wi-Fi hotspot configuration are **not implemented**.
- The host port remains bound to `127.0.0.1:8787` by Docker Compose. A future installer-facing access path must use a deliberately designed, authenticated local gateway ingress, rather than simply exposing this development service to the LAN.
- `setup_required` is a placeholder product state, not evidence of a persistent commissioning state machine.

## Manual smoke tests
1. Configure valid `AMJ_HA_URL` and `AMJ_HA_TOKEN`; start the local stack.
2. Visit `http://127.0.0.1:8787/gateway` on the gateway host. Confirm AMJ branding and capability overview.
3. Confirm `GET /v1/gateway/info` returns JSON without secrets or HA endpoint details.
4. Confirm `GET /gateway-status.js` is served as JavaScript with `no-store`.
5. Confirm `/v1/devices/preview` and `/v1/devices/relay` retain their existing authorization behavior.
6. Confirm the page never displays commissioning features as available when capability flags are false.

## Security requirements before customer deployment
- Installer onboarding with a short-lived, authenticated local session and physical-presence confirmation.
- Persistent gateway identity, credential rotation, account ownership and revocation.
- TLS or equivalent authenticated encrypted transport for non-loopback access.
- CSRF protection and session controls for any future state-changing web routes.
- Rate limiting, structured audit logs, recovery and factory-reset policy.
- Automated integration tests plus physical gateway, Zigbee, Wi-Fi AP and offline testing.

**This is a prototype dashboard, not a production gateway installer.**
