# CCTV-01 — Multi-brand architecture foundation

Status: foundation only. **No live streaming, discovery, camera storage, or recording playback is implemented by this change.**

## Supported integration model

- Camera sources: individual IP camera, NVR channel, DVR channel.
- Manufacturer labels: Hikvision, CP Plus, Dahua, Tapo, EZVIZ, Reolink, generic ONVIF, other.
- Connectivity: ONVIF for compatible discovery/capabilities, RTSP for supported media sources, vendor API where explicitly supported. No claim that all devices from a brand work.
- Browser media: RTSP cannot play natively. Later stages require a trusted, authenticated streaming gateway that transcodes or remuxes to a browser-compatible transport (such as WebRTC or HLS), with explicit latency and cost tradeoffs.
- NVR/DVR: represent each channel separately and bind it to its parent recorder; recording playback only if supported by the recorder's API/ONVIF profile.
- Credentials: encrypt at rest using managed secrets; never store credentials in Prisma JSON capability/state fields or send them to the browser; never log RTSP URLs containing user info.

## Security requirements for implementation

1. Reuse existing HomeMembership and role-based home access checks for every camera CRUD, live session, playback, snapshot, and PTZ operation. A guessed camera ID must not bypass home authorization.
2. Prevent SSRF: do not let an arbitrary user URL make the cloud server connect to LAN/private addresses. Use an explicitly enrolled, authenticated home-local gateway/agent to access LAN devices. Restrict target addresses to registered camera identities, enforce network allowlists, and block cloud metadata endpoints.
3. Enforce tenant isolation and session expiry for media URLs. Use short-lived scoped tokens; never expose long-lived stream credentials.
4. Restrict camera management to authorized owners/admins. Members may view only where their home role/permissions permit. PTZ and recording playback must have distinct capabilities.
5. No browser-direct access to private IP cameras, no open unauthenticated RTSP proxy, no default credentials, no plaintext credentials in database migrations.
6. Maintain audit trails for camera registration, configuration changes, and access failures, with no sensitive payloads.

## Stage gates

- **CCTV-01 (this PR):** metadata and capability contracts + architecture decisions. No production behavior change.
- **CCTV-02:** Prisma Camera/Recorder/CameraChannel entities, additive migration, tenant-scoped CRUD APIs, encrypted connection references, permission tests.
- **CCTV-03:** authenticated home-local gateway enrollment, ONVIF/RTSP compatibility checks, protected WebRTC/HLS live sessions, timeouts/rate limits, SSRF tests.
- **CCTV-04:** mobile-first camera dashboard, live grid, fullscreen, offline/error/unsupported states; no fake playable video.
- **CCTV-05:** NVR/DVR recording timelines and playback only for tested supported devices.
- **CCTV-06:** end-to-end integration, credential rotation, session revocation, observability and operational hardening.

## Compatibility matrix

Each manufacturer/model/firmware combination must be tested for ONVIF support, RTSP availability, authentication, live latency, snapshots, PTZ and playback before marked supported. Cloud-only cameras remain unsupported until an authorized vendor integration exists.

## Existing system impact

Do not alter the existing DeviceType, DeviceProtocol, switchboard models, or device command handling merely to add cameras. Preserve production home/device records and migrations. Camera streams and recorder channels are not normal switchboard channels.
