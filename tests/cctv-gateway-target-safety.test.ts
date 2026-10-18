import { describe, expect, it } from "vitest";
import { gatewayTargetMatches, isAllowedPrivateIPv4, localCameraTargetSchema } from "../lib/cctv/gateway-target-safety";
const homeId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const gatewayId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const cameraId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
describe("CCTV gateway target restrictions", () => {
  it("accepts literal RFC1918 camera addresses", () => {
    for (const ip of ["10.0.0.2", "172.16.0.20", "172.31.254.1", "192.168.1.200"]) {
      expect(isAllowedPrivateIPv4(ip)).toBe(true);
    }
  });
  it("rejects public, metadata, loopback, link-local, DNS, IPv6 and malformed targets", () => {
    for (const ip of ["8.8.8.8", "169.254.169.254", "127.0.0.1", "0.0.0.0", "192.0.0.1", "172.32.1.2", "172.15.1.2", "localhost", "camera.example.com", "::1", "192.168.1.255", "192.168.1.0", "192.168.1.1:554", "192.168.1.01"]) {
      expect(isAllowedPrivateIPv4(ip)).toBe(false);
    }
  });
  it("rejects injected credentials and URLs", () => {
    const valid = { homeId, gatewayId, cameraId, address: "192.168.1.5", port: 554, protocol: "RTSP" };
    expect(localCameraTargetSchema.safeParse(valid).success).toBe(true);
    expect(localCameraTargetSchema.safeParse({ ...valid, password: "admin" }).success).toBe(false);
    expect(localCameraTargetSchema.safeParse({ ...valid, address: "rtsp://192.168.1.5" }).success).toBe(false);
    expect(localCameraTargetSchema.safeParse({ ...valid, port: 0 }).success).toBe(false);
  });
  it("rejects cross-home, wrong camera, wrong gateway and inactive gateway", () => {
    const valid = { requestedHomeId: homeId, requestedGatewayId: gatewayId, requestedCameraId: cameraId, targetHomeId: homeId, targetGatewayId: gatewayId, targetCameraId: cameraId, gatewayActive: true, cameraApproved: true };
    expect(gatewayTargetMatches(valid)).toBe(true);
    expect(gatewayTargetMatches({ ...valid, targetHomeId: gatewayId })).toBe(false);
    expect(gatewayTargetMatches({ ...valid, targetGatewayId: cameraId })).toBe(false);
    expect(gatewayTargetMatches({ ...valid, targetCameraId: homeId })).toBe(false);
    expect(gatewayTargetMatches({ ...valid, gatewayActive: false })).toBe(false);
    expect(gatewayTargetMatches({ ...valid, cameraApproved: false })).toBe(false);
  });
});
