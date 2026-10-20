# CCTV-22 — ONVIF Media1 profile discovery

The local gateway now contains a bounded ONVIF Media1 `GetProfiles` SOAP client. It validates an explicitly supplied private IPv4 source address, restricts endpoint ports, refuses redirects, enforces response byte limits, and returns only profile names and tokens.

Example from the **local gateway** (not the public server):

```sh
node --input-type=module -e 'import { fetchMediaProfiles } from "./gateway/cctv/onvif-media.mjs"; console.log(await fetchMediaProfiles({ sourceAddress: "192.168.1.20", serviceUrl: "http://192.168.1.20/onvif/media_service" }))'
```

This currently supports only cameras exposing Media1 without authentication. Most real cameras require ONVIF WS-Security UsernameToken and separate user provisioning; those are not yet implemented. Discovery XAddr is usually a **device** service URL, not necessarily the **media** service URL. The next step is authenticated `GetCapabilities` or `GetServices` to find the actual media endpoint, then authenticated `GetProfiles` and `GetStreamUri`. No camera credentials are sent, and no RTSP connection or live video is established. No browser should directly call local ONVIF URLs.
