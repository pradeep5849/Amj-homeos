import { z } from "zod";

/**
 * The cloud never accepts arbitrary camera URLs or private-network hosts.
 * Local network discovery and RTSP/ONVIF transport belong to the paired gateway.
 */
export const gatewayCameraReportSchema = z.object({
  cameraId: z.uuid(),
  connectionStatus: z.enum(["ONLINE", "OFFLINE", "ERROR"]),
  capabilities: z.object({
    live: z.boolean(),
    recordings: z.boolean(),
    ptz: z.boolean(),
    audio: z.boolean(),
    snapshots: z.boolean(),
  }).strict(),
}).strict();

export function safeCameraReport(input: unknown) {
  return gatewayCameraReportSchema.parse(input);
}
