import type { LocalCameraEndpoint } from "./local-camera-endpoint";
import { parseLocalCameraEndpoint } from "./local-camera-endpoint";

/**
 * Gateway-local ONVIF Media1 GetProfiles request.
 * Profiles are discovered from a paired LAN camera, never supplied by a browser.
 */
export function onvifGetProfilesRequest(endpoint: LocalCameraEndpoint) {
  const camera = parseLocalCameraEndpoint(endpoint);
  return {
    url: "http://" + camera.host + ":" + camera.onvifPort + "/onvif/media_service",
    method: "POST" as const,
    headers: { "content-type": "application/soap+xml; charset=utf-8" },
    body: '<?xml version="1.0" encoding="UTF-8"?>' +
      '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" ' +
      'xmlns:trt="http://www.onvif.org/ver10/media/wsdl">' +
      '<s:Body><trt:GetProfiles/></s:Body></s:Envelope>',
  };
}

/** Fail closed on malformed or entity-bearing responses. */
export function parseOnvifProfileTokens(xml: string): string[] {
  if (xml.length > 65536 || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("Invalid ONVIF XML");
  if (!/<(?:[\w.-]+:)?GetProfilesResponse\b/.test(xml) ||
      /<(?:[\w.-]+:)?Fault\b/.test(xml)) throw new Error("Invalid ONVIF profiles response");
  const tokens: string[] = [];
  const pattern = /<(?:[\w.-]+:)?Profiles\b[^>]*\btoken="([A-Za-z0-9_.:-]{1,128})"[^>]*>/g;
  for (const match of xml.matchAll(pattern)) {
    if (!tokens.includes(match[1])) tokens.push(match[1]);
    if (tokens.length > 64) throw new Error("Too many ONVIF profiles");
  }
  return tokens;
}
