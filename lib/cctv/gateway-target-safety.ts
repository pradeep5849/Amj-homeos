import { isIP } from "node:net";
import { z } from "zod";

/**
 * Pure validation for a home-local gateway's explicit camera target allowlist.
 * This is not a cloud-side proxy, network scanner, or DNS resolver.
 * Only literal RFC1918 IPv4 targets are permitted; agent enrollment,
 * home ownership and camera-target binding are separately mandatory.
 */
export const localCameraTargetSchema = z.object({
  cameraId: z.uuid(),
  homeId: z.uuid(),
  gatewayId: z.uuid(),
  address: z.string().max(45).refine(isAllowedPrivateIPv4, "Only private LAN IPv4 camera addresses are allowed"),
  port: z.number().int().min(1).max(65535),
  protocol: z.enum(["RTSP", "ONVIF_HTTP", "ONVIF_HTTPS"]),
}).strict();

export function isAllowedPrivateIPv4(address: string): boolean {
  if (isIP(address) !== 4) return false;
  const octets = address.split(".").map(Number);
  const [a, b, , d] = octets;
  if (d === 0 || d === 255) return false;
  // RFC1918 only. Excludes localhost, link-local, metadata and public hosts.
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

export function gatewayTargetMatches(input: {
  requestedHomeId: string;
  requestedGatewayId: string;
  requestedCameraId: string;
  targetHomeId: string;
  targetGatewayId: string;
  targetCameraId: string;
  gatewayActive: boolean;
  cameraApproved: boolean;
}): boolean {
  return input.gatewayActive && input.cameraApproved
    && input.requestedHomeId === input.targetHomeId
    && input.requestedGatewayId === input.targetGatewayId
    && input.requestedCameraId === input.targetCameraId;
}
