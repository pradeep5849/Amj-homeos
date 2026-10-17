import { describe, expect, it } from "vitest";
import { parseLocalCameraEndpoint } from "../lib/cctv/local-camera-endpoint";

describe("gateway-local camera endpoint policy", () => {
  it("accepts explicitly configured private IPv4 endpoints", () => {
    expect(parseLocalCameraEndpoint({ host: "192.168.1.50", rtspPort: 554, onvifPort: 80 })).toEqual({
      host: "192.168.1.50", rtspPort: 554, onvifPort: 80,
    });
    expect(parseLocalCameraEndpoint({ host: "10.1.2.3", rtspPort: 8554, onvifPort: 8080 }).host).toBe("10.1.2.3");
  });
  it.each(["127.0.0.1", "169.254.169.254", "8.8.8.8", "camera.local", "::1", "0.0.0.0"])(
    "rejects non-private or non-IP host %s", host => {
      expect(() => parseLocalCameraEndpoint({ host, rtspPort: 554, onvifPort: 80 })).toThrow();
    },
  );
  it("rejects arbitrary URLs, credentials and invalid ports", () => {
    expect(() => parseLocalCameraEndpoint({ host: "192.168.1.2", rtspPort: 0, onvifPort: 80 })).toThrow();
    expect(() => parseLocalCameraEndpoint({
      host: "192.168.1.2", rtspPort: 554, onvifPort: 80, password: "secret",
    })).toThrow();
  });
});
