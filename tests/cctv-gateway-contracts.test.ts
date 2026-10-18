import { describe, expect, it } from "vitest";
import {
  gatewayEnrollmentRequestSchema,
  gatewayHeartbeatSchema,
  liveTicketRequestSchema,
  mayIssueLiveTicket,
} from "../lib/cctv/gateway-contracts";

const homeId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const otherHomeId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const cameraId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const gatewayId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

describe("CCTV local gateway security contracts", () => {
  it("requires a scoped enrollment code and public key", () => {
    const valid = { homeId, displayName: "Living room agent", publicKey: "A".repeat(64), enrollmentCode: "b".repeat(32) };
    expect(gatewayEnrollmentRequestSchema.safeParse(valid).success).toBe(true);
    expect(gatewayEnrollmentRequestSchema.safeParse({ ...valid, password: "unsafe" }).success).toBe(false);
    expect(gatewayEnrollmentRequestSchema.safeParse({ ...valid, enrollmentCode: "short" }).success).toBe(false);
    expect(gatewayEnrollmentRequestSchema.safeParse({ ...valid, publicKey: "rtsp://192.168.1.2" }).success).toBe(false);
  });
  it("rejects unscoped heartbeat and unknown fields", () => {
    const valid = { gatewayId, homeId, timestamp: "2026-10-18T00:00:00Z", nonce: "abcdefgh12345678", cameraIds: [cameraId] };
    expect(gatewayHeartbeatSchema.safeParse(valid).success).toBe(true);
    expect(gatewayHeartbeatSchema.safeParse({ ...valid, password: "leak" }).success).toBe(false);
    expect(gatewayHeartbeatSchema.safeParse({ ...valid, nonce: "x" }).success).toBe(false);
  });
  it("only accepts supported browser media transports", () => {
    expect(liveTicketRequestSchema.safeParse({ homeId, cameraId, transport: "WEBRTC" }).success).toBe(true);
    expect(liveTicketRequestSchema.safeParse({ homeId, cameraId, transport: "RTSP" }).success).toBe(false);
  });
  it("fails closed for cross-home, revoked, offline and unauthorized access", () => {
    const valid = { gatewayState: "ACTIVE" as const, cameraHomeId: homeId, requestedHomeId: homeId, cameraId, approvedCameraIds: [cameraId], cameraOnline: true, gatewayOnline: true, userCanView: true };
    expect(mayIssueLiveTicket(valid)).toBe(true);
    expect(mayIssueLiveTicket({ ...valid, cameraHomeId: otherHomeId })).toBe(false);
    expect(mayIssueLiveTicket({ ...valid, gatewayState: "REVOKED" })).toBe(false);
    expect(mayIssueLiveTicket({ ...valid, gatewayState: "SUSPENDED" })).toBe(false);
    expect(mayIssueLiveTicket({ ...valid, approvedCameraIds: [] })).toBe(false);
    expect(mayIssueLiveTicket({ ...valid, cameraOnline: false })).toBe(false);
    expect(mayIssueLiveTicket({ ...valid, gatewayOnline: false })).toBe(false);
    expect(mayIssueLiveTicket({ ...valid, userCanView: false })).toBe(false);
  });
});
