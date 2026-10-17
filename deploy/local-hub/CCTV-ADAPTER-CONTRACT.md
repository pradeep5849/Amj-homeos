# CCTV adapter integration contract

The shared registry supports Hikvision, CP Plus and Dahua through one typed runtime contract. Adapters are registered per exact camera entity, model and firmware. An operation is available only when explicitly enabled AND backed by an implementation function. The public profile never serializes adapter methods or private credentials.

The following are **not yet implemented**: actual vendor adapters, browser live stream transport, NVR recording search and playback, PTZ, two-way audio and motion/doorbell event delivery. This registry is deliberately not wired to an HTTP control route: authentication, hardware capability verification, media transport and per-home permission checks must be integrated first.

Next gate: implement a sandboxed, tested adapter for an exact model and a TLS-capable media gateway; verify RTSP/ONVIF or vendor API support on physical hardware before exposing any capability to RUVEXA. No generic claim that every camera from a supported brand implements every function.
