import { describe, expect, it } from "vitest";
import { safeCameraReport } from "../lib/cctv/gateway-camera-report";

const cameraId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const capabilities = { live: true, recordings: false, ptz: false, audio: false, snapshots: true };

describe("CCTV local gateway reports", () => {
  it("accepts only explicit, bounded camera capability metadata", () => {
    expect(safeCameraReport({ cameraId, connectionStatus: "ONLINE", capabilities })).toEqual({
      cameraId, connectionStatus: "ONLINE", capabilities,
    });
  });
  it("rejects arbitrary camera network addresses and credentials", () => {
    expect(() => safeCameraReport({
      cameraId, connectionStatus: "ONLINE", capabilities, rtspUrl: "rtsp://127.0.0.1/private",
    })).toThrow();
    expect(() => safeCameraReport({
      cameraId, connectionStatus: "ONLINE", capabilities: { ...capabilities, password: "secret" },
    })).toThrow();
  });
});
