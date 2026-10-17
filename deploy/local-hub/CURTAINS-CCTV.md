# Curtain positioning and CCTV still images (prototype)

The local gateway supports two additional device types through installer-approved customer sessions.

## Curtains
Set `AMJ_ALLOWED_CURTAIN_ENTITIES=cover.bedroom,cover.living_room` and explicitly grant the selected cover IDs to the customer session. Devices reporting Home Assistant cover feature `SET_POSITION` (bit 4) show a **0–100% open** slider. Position 0 means fully closed, 100 means fully open. The gateway checks permissions and the live device feature before calling `cover.set_cover_position`. Open, close and stop controls remain available where supported.

## CCTV cameras
Set `AMJ_ALLOWED_CAMERA_ENTITIES=camera.driveway,camera.entry` and explicitly grant each camera to a customer session. Only camera entity IDs are accepted. The gateway fetches a **still JPEG/PNG** from Home Assistant's `/api/camera_proxy/<entity_id>` and returns it through an authenticated, private, no-store, size-limited (2 MB) endpoint. The Home Assistant access token and original camera URL are never returned to the client. The browser shows a still image only when the user requests one and revokes the object URL on refresh/disconnect.

**Not implemented:** live RTSP/WebRTC/HLS streaming, NVR playback/recordings, PTZ, two-way audio, notifications, cloud remote access, camera vendor onboarding or production-grade authentication. Home Assistant's camera proxy support varies by integration; some cameras will not return snapshots. Do not deploy this prototype over untrusted HTTP networks; production needs TLS, device-bound authorization and audited access.
