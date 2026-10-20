# CCTV-21 — ONVIF WS-Discovery (local gateway only)

The local gateway can now send a WS-Discovery UDP multicast Probe to `239.255.255.250:3702` and collect advertised ONVIF device service endpoints from cameras on the local network.

Example from the gateway machine:

```sh
node --input-type=module -e 'import { discoverOnvif } from "./gateway/cctv/onvif-discovery.mjs"; console.log(await discoverOnvif({ timeoutMs: 3000 }))'
```

**Security:** Discovery does not run on the public HomeOS server. It rejects non-private IPv4 responders, advertised URLs pointing to other hosts, embedded credentials, and unsupported schemes. The discovered URLs are **untrusted metadata** and are never fetched automatically. Additional DNS rebinding, network policy, host validation and authenticated access controls are required before ONVIF SOAP requests or RTSP connections.

**Scope:** Discovery only. It does not yet authenticate to ONVIF devices, enumerate media profiles, open video streams, persist cameras to HomeOS, or control PTZ. Network multicast may be blocked by VLAN/router/firewall policies. Some cameras require ONVIF to be enabled and a separate ONVIF user account.
