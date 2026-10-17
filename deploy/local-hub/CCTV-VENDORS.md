# CCTV vendor compatibility plan — Hikvision, CP Plus, Dahua

AMJ HomeOS / RUVEXA targets all three vendors. A vendor name alone does **not** guarantee feature support. The gateway must verify the exact camera/NVR model, firmware, configured permissions, transport, and available services. This document describes the integration contract; it is not a claim that these features are implemented.

## Shared capability-first adapter architecture
- **Discovery:** ONVIF where supported, Home Assistant camera entities, and installer-entered device/NVR addresses. Never scan or expose arbitrary LAN devices to customer sessions.
- **Video:** local authenticated RTSP source negotiated by the gateway and repackaged as browser-compatible WebRTC/HLS where an installed, vetted media gateway supports it. Never expose camera credentials or raw RTSP URLs in the customer app. TLS and per-session access tokens required for non-loopback access.
- **Recordings:** adapter-backed channel/time-range search, timeline, playback and clip export. Requires supported NVR APIs, permissions, timezone handling, channel mapping, and retention policy. Do not assume ONVIF live-video support implies recording playback.
- **PTZ:** allowlisted pan/tilt/zoom and preset actions, bounded movements, per-camera feature flags and operator permissions; stop on disconnect/timeouts.
- **Two-way audio:** negotiate codecs and audio backchannel only where the exact device and adapter support it. Never auto-enable microphone; require explicit user action.
- **Events:** motion/person/doorbell alerts through supported event APIs; de-duplicate and rate-limit notifications.
- **Privacy:** installer-approved camera grants, per-home isolation, auditing, no raw credentials in client responses, no default public Internet exposure. Video/recording access needs production authentication and TLS.

## Vendor adapter profiles

| Vendor | Discovery candidates | Live viewing candidates | Recording/PTZ/audio requirements |
| --- | --- | --- | --- |
| Hikvision | ONVIF + vendor APIs where supported | RTSP + vetted media bridge | Model-specific ISAPI/ONVIF support and NVR channel mapping |
| CP Plus | ONVIF on compatible models; vendor-specific variants | RTSP on supported devices | Identify underlying OEM/model/firmware; no universal CP Plus API assumption |
| Dahua | ONVIF + vendor APIs where supported | RTSP + vetted media bridge | Model-specific CGI/ONVIF support and NVR channel mapping |

## Implemented now
Read-only camera entity discovery, scoped inventory, installer-granted still-image access through Home Assistant, strict camera entity validation, bounded JPEG/PNG response, and explicit fail-closed capability flags. **Live, recordings, PTZ, two-way audio and events remain unimplemented** until tested adapters/media transport are added. Do not turn on capability flags based only on brand.
