# CCTV-24 — ONVIF device GetServices

The local gateway now supports ONVIF Device `GetServices` to locate Media1 and Media2 service endpoints before requesting media profiles.

```js
import { fetchMediaServiceUrls } from "./gateway/cctv/onvif-services.mjs";
const services = await fetchMediaServiceUrls({
  deviceServiceUrl: "http://192.168.1.20/onvif/device_service",
  sourceAddress: "192.168.1.20",
  credentials: { username: process.env.ONVIF_USER, password: process.env.ONVIF_PASSWORD },
});
```

The gateway validates the device URL and advertised media service addresses against the same private IPv4 source, blocks redirects, and limits response size. WS-Security UsernameToken supports cameras requiring ONVIF credentials. Do not log passwords or send them to browsers.

**Scope:** This is endpoint discovery only. Media2 GetProfiles is not implemented, and actual device connectivity, authenticated GetStreamUri, RTSP streaming, recording and PTZ are still pending. No live physical-camera validation has occurred.
