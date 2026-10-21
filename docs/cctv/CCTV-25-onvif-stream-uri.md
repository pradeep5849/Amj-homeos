# CCTV-25 — ONVIF Media1 GetStreamUri

The local gateway can now request an RTSP unicast stream address for a known ONVIF Media1 profile token:

```js
import { fetchStreamUri } from "./gateway/cctv/onvif-stream-uri.mjs";
const stream = await fetchStreamUri({
  mediaServiceUrl: "http://192.168.1.20/onvif/media",
  sourceAddress: "192.168.1.20",
  profileToken: "main",
  credentials: { username: process.env.ONVIF_USER, password: process.env.ONVIF_PASSWORD },
});
console.log(stream.host, stream.port); // Do not print complete URI in production logs.
```

**Security boundary:** This code only runs in the trusted local gateway, never in the browser or public API. It rejects RTSP URIs containing embedded credentials or pointing to other devices, and refuses HTTP redirects. No RTSP socket is opened. Keep camera credentials in a protected local secret store; avoid printing stream URIs because camera URLs may contain sensitive query parameters.

**Not yet implemented:** RTSP authentication and transport, decoding/transcoding, HLS/WebRTC playback, stream authorization, recording or PTZ. Camera interoperability requires testing against physical hardware.
