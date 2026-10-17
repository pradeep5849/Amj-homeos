import { describe, expect, it } from "vitest";
import { parseCctvStreamSource, publicStreamSource } from "../deploy/local-hub/cctv-stream-sources.mjs";
const base = { entityId: "camera.front", brand: "hikvision", rtspUrl: "rtsp://192.168.1.50:554/Streaming/Channels/101" };
describe("CCTV stream source validation", () => {
  it("accepts private IPv4 RTSP sources for all three brands", () => {
    for (const brand of ["hikvision", "cp_plus", "dahua"]) {
      const source = parseCctvStreamSource({ ...base, brand });
      expect(source).toMatchObject({ entityId: "camera.front", brand, host: "192.168.1.50", port: 554 });
      expect(publicStreamSource(source)).toEqual({ entityId: "camera.front", brand, configured: true });
      expect(JSON.stringify(publicStreamSource(source))).not.toContain("192.168");
    }
  });
  it("rejects external, credentialed and malformed RTSP targets", () => {
    for (const rtspUrl of [
      "rtsp://8.8.8.8:554/live", "rtsp://example.com:554/live",
      "rtsp://127.0.0.1:554/live", "rtsp://169.254.1.2:554/live",
      "http://192.168.1.50:554/live", "rtsp://user:pass@192.168.1.50:554/live",
      "rtsp://192.168.1.50:554/live?token=abc", "rtsp://192.168.1.50:554/live#x",
      "rtsp://192.168.1.50/live", "rtsp://192.168.1.50:554/../private",
    ]) expect(parseCctvStreamSource({ ...base, rtspUrl })).toBeNull();
    expect(parseCctvStreamSource({ ...base, brand: "unknown" })).toBeNull();
    expect(parseCctvStreamSource({ ...base, entityId: "lock.front" })).toBeNull();
  });
});
