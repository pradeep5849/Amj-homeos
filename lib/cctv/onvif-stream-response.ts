import { validateDiscoveredRtspUri } from "./onvif-stream-uri";
import type { LocalCameraEndpoint } from "./local-camera-endpoint";

/**
 * Narrow GetStreamUri response parser. This is not a general-purpose XML parser.
 * Reject DTD/entities and multiple URI elements rather than guessing.
 */
export function parseOnvifStreamUri(xml: string, endpoint: LocalCameraEndpoint): string {
  if (xml.length > 65536 || /<!DOCTYPE|<!ENTITY|<\?xml-stylesheet/i.test(xml)) {
    throw new Error("Unsupported ONVIF XML");
  }
  if (!/<(?:[\w.-]+:)?Envelope\b/.test(xml) ||
      !/<(?:[\w.-]+:)?GetStreamUriResponse\b/.test(xml) ||
      /<(?:[\w.-]+:)?Fault\b/.test(xml)) {
    throw new Error("Invalid ONVIF stream response");
  }
  const matches = [...xml.matchAll(/<(?:[\w.-]+:)?Uri>([^<>]{1,2048})<\/(?:[\w.-]+:)?Uri>/g)];
  if (matches.length !== 1) throw new Error("Expected one ONVIF stream URI");
  return validateDiscoveredRtspUri(matches[0][1].trim(), endpoint);
}
