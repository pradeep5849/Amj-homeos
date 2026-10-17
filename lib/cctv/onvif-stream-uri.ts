import type { LocalCameraEndpoint } from "./local-camera-endpoint";
import { parseLocalCameraEndpoint } from "./local-camera-endpoint";

export function onvifGetStreamUriRequest(endpoint: LocalCameraEndpoint, profileToken: string) {
  const camera = parseLocalCameraEndpoint(endpoint);
  if (!/^[A-Za-z0-9_.:-]{1,128}$/.test(profileToken)) throw new Error("Invalid ONVIF profile token");
  return {
    url: "http://" + camera.host + ":" + camera.onvifPort + "/onvif/media_service",
    method: "POST" as const,
    headers: { "content-type": "application/soap+xml; charset=utf-8" },
    body: '<?xml version="1.0" encoding="UTF-8"?>' +
      '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" ' +
      'xmlns:trt="http://www.onvif.org/ver10/media/wsdl">' +
      '<s:Body><trt:GetStreamUri><trt:StreamSetup>' +
      '<tt:Stream xmlns:tt="http://www.onvif.org/ver10/schema">RTP-Unicast</tt:Stream>' +
      '<tt:Transport xmlns:tt="http://www.onvif.org/ver10/schema"><tt:Protocol>RTSP</tt:Protocol></tt:Transport>' +
      '</trt:StreamSetup><trt:ProfileToken>' + profileToken + '</trt:ProfileToken>' +
      '</trt:GetStreamUri></s:Body></s:Envelope>',
  };
}

/**
 * Never return a discovered RTSP URI to a browser. Verify its destination
 * against the camera configured on the trusted local gateway.
 */
export function validateDiscoveredRtspUri(uri: string, endpoint: LocalCameraEndpoint) {
  const camera = parseLocalCameraEndpoint(endpoint);
  if (uri.length > 2048 || /[\r\n]/.test(uri)) throw new Error("Invalid RTSP URI");
  const parsed = new URL(uri);
  if (parsed.protocol !== "rtsp:" || parsed.hostname !== camera.host ||
      Number(parsed.port || "554") !== camera.rtspPort || parsed.username || parsed.password ||
      parsed.hash) throw new Error("Unexpected RTSP stream destination");
  return uri;
}
