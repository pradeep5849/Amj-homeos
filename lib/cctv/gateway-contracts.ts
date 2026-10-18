import { z } from "zod";

/**
 * Validation boundary for future enrolled home-local camera agents.
 * Not an enrollment service: no credentials, network probing, or streaming.
 */
export const gatewayEnrollmentRequestSchema = z.object({
  homeId: z.uuid(),
  displayName: z.string().trim().min(1).max(120),
  publicKey: z.string().min(40).max(4096).regex(/^[A-Za-z0-9+/=\r\n-]+$/),
  enrollmentCode: z.string().min(24).max(256),
}).strict();

export const gatewayHeartbeatSchema = z.object({
  gatewayId: z.uuid(),
  homeId: z.uuid(),
  timestamp: z.iso.datetime({ offset: true }),
  nonce: z.string().min(16).max(128).regex(/^[A-Za-z0-9_-]+$/),
  cameraIds: z.array(z.uuid()).max(256),
}).strict();

export const liveTicketRequestSchema = z.object({
  homeId: z.uuid(),
  cameraId: z.uuid(),
  transport: z.enum(["WEBRTC", "HLS"]),
}).strict();

export const gatewayStates = ["PENDING", "ACTIVE", "SUSPENDED", "REVOKED"] as const;
export type GatewayState = (typeof gatewayStates)[number];

export function mayIssueLiveTicket(input: {
  gatewayState: GatewayState;
  cameraHomeId: string;
  requestedHomeId: string;
  cameraId: string;
  approvedCameraIds: readonly string[];
  cameraOnline: boolean;
  gatewayOnline: boolean;
  userCanView: boolean;
}): boolean {
  return input.gatewayState === "ACTIVE"
    && input.cameraHomeId === input.requestedHomeId
    && input.approvedCameraIds.includes(input.cameraId)
    && input.cameraOnline
    && input.gatewayOnline
    && input.userCanView;
}
