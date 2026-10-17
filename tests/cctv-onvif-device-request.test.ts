import { describe, expect, it } from "vitest";
import { onvifDeviceInformationRequest } from "../lib/cctv/onvif-device-request";

describe("ONVIF local device service request", () => {
  it("uses a fixed device service path and SOAP action", () => {
    const request = onvifDeviceInformationRequest({
      host: "192.168.0.23", rtspPort: 554, onvifPort: 8080,
    });
    expect(request.url).toBe("http://192.168.0.23:8080/onvif/device_service");
    expect(request.method).toBe("POST");
    expect(request.body).toContain("<tds:GetDeviceInformation/>");
    expect(request.headers["content-type"]).toContain("application/soap+xml");
  });
  it("rejects internet targets", () => {
    expect(() => onvifDeviceInformationRequest({
      host: "1.1.1.1", rtspPort: 554, onvifPort: 80,
    })).toThrow();
  });
});
