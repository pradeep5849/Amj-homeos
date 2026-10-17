# CCTV-03a — Secure Connectivity Architecture (Design Gate)

Status: architecture only. No discovery, credential collection, network access, stream proxying or playback is implemented in this stage.

## Trust boundaries

1. **Browser / Android client (untrusted):** may request authorized camera metadata and later short-lived viewing sessions. Must never receive device passwords, RTSP URLs, gateway service credentials or secret-store references.
2. **AMJ HomeOS cloud API (authorization authority):** authenticates every request, checks tenant/home membership and permission, rejects archived homes/cameras/recorders, applies rate limits and writes audit events. Does not connect directly to private LAN cameras.
3. **Home gateway (local network agent):** installed and paired to exactly one home; initiates outbound authenticated TLS connections to cloud; discovers/connects to devices only on explicitly configured permitted local networks. No inbound router port forwarding or public camera ports.
4. **Secret vault:** encrypts camera/recorder credentials at rest using managed keys and per-home scoping. Only authorized gateway operations can retrieve credentials; cloud API responses and logs must never expose them. Secret references remain server-only.
5. **Camera / NVR / DVR (untrusted device):** vendor protocol adapters must validate input and treat device responses as untrusted. The gateway restricts outbound destinations to paired private devices to prevent SSRF.

## Gateway enrollment and lifecycle

- Home OWNER or authorized ADMIN requests enrollment; cloud creates a single-use, short-expiry pairing challenge scoped to home and actor.
- Gateway generates a non-exportable keypair if supported, exchanges the challenge for a device-bound certificate/credential, and stores private keys in OS protected storage.
- Cloud maintains gateway id, home id, certificate identity, version, capabilities, last-seen and ACTIVE/SUSPENDED/REVOKED state.
- Every gateway call authenticates cryptographically and authorizes home scope; revocation immediately prevents new sessions. Rotate credentials, limit concurrent enrollments, audit pairing/revocation.
- Gateways make outbound connections only. Disconnects must fail closed for new remote access; no implicit local admin bypass.

## Vendor-neutral adapter interface

Adapters advertise capabilities (snapshot, live, recording search, PTZ, audio), protocol and version. Start with ONVIF capability probing when available; vendor-specific adapters for Hikvision, Dahua and CP Plus require independent conformance tests. Other brands (Tapo, EZVIZ, Reolink) remain unsupported for remote operations until tested. Do not equate a declared capability with a verified working feature.

Device onboarding is explicitly user-initiated and permission-scoped. Validate addresses as permitted LAN targets, resolve DNS and check every resolved IP, disallow redirects to public/internal cloud metadata endpoints, enforce timeouts, bounded response sizes, request rate limits and TLS verification when supported. Do not permit arbitrary user-supplied URLs to become server-side fetch targets.

## Secret handling

Credential creation and rotation require authorized management permission, encrypted transport and vault encryption. Never place passwords in Prisma Camera/CameraRecorder metadata rows, request logs, telemetry, browser storage, crash reports or job payloads. Persist only opaque secretRef server-side; rotate/revoke secrets on camera removal and gateway compromise. Define a migration and recovery procedure before implementation.

## Live view and recordings (future stages)

Cloud issues short-lived, camera-scoped authorization grants after checking user, home, device, subscription and gateway status. Gateway validates grants and connects to the device. Streaming uses an explicitly authenticated relay or WebRTC path; do not return raw RTSP credentials or publicly accessible stream URLs. Sessions expire, revoke on access removal, enforce concurrent stream quotas, protect recordings with separate access checks, and audit starts/stops. No playback API is authorized by this document alone.

## Safety and acceptance gates

- Cross-home access denied at API, gateway, vault and stream session layers.
- Suspended/revoked gateway and archived camera/home cannot create sessions.
- Secret and private endpoint redaction verified in all outputs/logs.
- Replay, expired grants, SSRF, DNS rebinding, malformed ONVIF/XML, offline gateway, credential rotation and rate-limit cases tested.
- No outbound LAN probing or streaming in CI; use isolated fakes.
- Security review, threat-model review, green application CI and green dependency audit before merge.

## Sequencing

CCTV-03a: design and threat model (this document).
CCTV-03b: gateway registry and secure pairing primitives.
CCTV-03c: vault-backed credentials and rotation.
CCTV-03d: isolated device adapter interfaces and fake-device tests.
CCTV-04+: controlled discovery and connectivity, then separately authorized streaming and playback.
