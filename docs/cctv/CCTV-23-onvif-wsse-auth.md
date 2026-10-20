# CCTV-23 — ONVIF WS-Security UsernameToken

The local gateway's `fetchMediaProfiles` now optionally accepts `credentials: { username, password }` and sends ONVIF WS-Security UsernameToken `PasswordDigest` in the SOAP header. Digest calculation follows ONVIF UsernameToken conventions: Base64(SHA1(raw nonce bytes + Created + password)). Each request receives a fresh cryptographic nonce and timestamp.

**Credentials must remain on the local gateway.** Do not send them to browser clients, commit them to Git, or put them in URL query strings. Use a separate ONVIF account with the minimum necessary permissions. Some cameras have clock-skew requirements; ensure gateway and camera time are synchronized.

This is **not** a complete camera setup workflow. No credential vault, camera service discovery, authenticated GetStreamUri, RTSP transport, recording or PTZ is provided. The local gateway must be protected from untrusted LAN devices and DNS/redirect attacks; production deployment needs additional request-level network controls.
