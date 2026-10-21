# CCTV-26 — Local RTSP connectivity probe

The gateway now provides a diagnostic-only RTSP `OPTIONS` probe for a known same-host, private IPv4 stream URI returned by ONVIF. It checks the TCP connection and parses the RTSP status and supported methods. A `401` response means the server is reachable but requires authentication, **not** that video works.

The probe uses an explicit timeout, bounded response, CSeq validation, and checks the connected peer address. It never sends camera credentials and does not run on the public server.

Example (local gateway only):
```js
import { probeRtspOptions } from "./gateway/cctv/rtsp-probe.mjs";
const result = await probeRtspOptions({
  uri: "rtsp://192.168.1.20:554/live",
  sourceAddress: "192.168.1.20",
});
console.log(result.status, result.methods);
```

**Not implemented:** RTSP authentication, DESCRIBE/SETUP/PLAY, RTP media reception, browser playback, recordings or PTZ. Do not expose the probe as an arbitrary network target endpoint.
