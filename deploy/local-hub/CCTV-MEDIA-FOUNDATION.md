# CCTV media/NVR authorization foundation

Hikvision, CP Plus and Dahua integrations will share a media authorization layer, while each exact model/firmware receives a verified adapter.

- `cctv-tickets.mjs`: random, hashed, 30-second, one-use tickets scoped to camera, customer session and media purpose (`live` or `recordingPlayback`); replay protection, expiration, session revocation and bounded ticket count.
- `cctv-recording-search.mjs`: strictly validates camera grants, ISO UTC timestamps and at most 24-hour NVR search windows, rejecting future and very old ranges.
- Both modules are **foundation only**. They are deliberately **not exposed as HTTP routes** until the media proxy, verified adapter and production session lifecycle are integrated. In particular, a ticket does not grant access to any video stream yet.
- Production media access must require TLS, per-home isolation, no client-visible RTSP/NVR credentials, device-specific media session authorization, resource caps, media-session termination on logout and audit trails.
- Recording retrieval, live streaming, PTZ, audio and events remain unavailable until the corresponding vendor adapter passes hardware tests.
