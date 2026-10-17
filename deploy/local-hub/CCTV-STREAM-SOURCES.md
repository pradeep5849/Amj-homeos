# CCTV stream source validation

This milestone validates installer-provided RTSP endpoints for Hikvision, CP Plus and Dahua. Only literal RFC1918 private IPv4 destinations with explicit RTSP ports are accepted. Hostnames, public IPs, localhost, link-local addresses, embedded credentials, query tokens and fragments are rejected. Customer-visible metadata omits IP address, RTSP path and secrets.

This **does not implement streaming**. A production media worker must use strict network egress rules, avoid arbitrary URL fetches, securely retrieve credentials server-side, enforce DNS/IP pinning and per-home network segmentation, transcode/remux to WebRTC/HLS where appropriate, cap resources, require TLS and authenticate each media session. RTSP alone does not guarantee audio backchannel, PTZ or recording playback.

The current validator intentionally rejects RTSP URL query parameters and credentials, even though some models use them. Those models require dedicated adapters that store credentials in a secret store and build URLs only inside the isolated media worker.
