import { isIP } from "node:net";

/**
 * Gateway-local only: never call this from a cloud API with user-provided URLs.
 * Addresses must be explicitly provisioned by the local gateway administrator.
 */
export type LocalCameraEndpoint = {
  host: string;
  rtspPort: number;
  onvifPort: number;
};

export function parseLocalCameraEndpoint(input: unknown): LocalCameraEndpoint {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid camera endpoint");
  const value = input as Record<string, unknown>;
  if (Object.keys(value).some(key => !["host", "rtspPort", "onvifPort"].includes(key))) {
    throw new Error("Unexpected camera endpoint field");
  }
  if (typeof value.host !== "string" || isIP(value.host) === 0) {
    throw new Error("Camera host must be an IP address, not a hostname");
  }
  // Only IPv4 RFC1918 private addresses are supported in the initial connector.
  const host = value.host;
  if (isIP(host) !== 4) throw new Error("Only private IPv4 camera addresses are supported");
  const parts = host.split(".").map(Number);
  const privateIp = parts[0] === 10 ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168);
  if (!privateIp) throw new Error("Camera IP must be on a private LAN");
  for (const port of [value.rtspPort, value.onvifPort]) {
    if (!Number.isInteger(port) || (port as number) < 1 || (port as number) > 65535) {
      throw new Error("Invalid camera port");
    }
  }
  return { host, rtspPort: value.rtspPort as number, onvifPort: value.onvifPort as number };
}
