import { describe, expect, it } from "vitest";
import { parseOnvifDeviceInformation } from "../lib/cctv/onvif-device-response";

const valid = '<s:Envelope><s:Body><tds:GetDeviceInformationResponse>' +
  '<tds:Manufacturer>Example</tds:Manufacturer><tds:Model>IP Camera</tds:Model>' +
  '<tds:FirmwareVersion>1.0</tds:FirmwareVersion><tds:SerialNumber>1234</tds:SerialNumber>' +
  '<tds:HardwareId>revA</tds:HardwareId></tds:GetDeviceInformationResponse></s:Body></s:Envelope>';

describe("ONVIF device information response", () => {
  it("extracts five basic fields", () => {
    expect(parseOnvifDeviceInformation(valid)).toEqual({
      manufacturer: "Example", model: "IP Camera", firmwareVersion: "1.0",
      serialNumber: "1234", hardwareId: "revA",
    });
  });
  it("rejects entity declarations and SOAP faults", () => {
    expect(() => parseOnvifDeviceInformation('<!DOCTYPE x [<!ENTITY x SYSTEM "file:///etc/passwd">]>' + valid)).toThrow();
    expect(() => parseOnvifDeviceInformation(valid.replace("</s:Body>", "<s:Fault/>" + "</s:Body>"))).toThrow();
  });
  it("rejects incomplete responses", () => {
    expect(() => parseOnvifDeviceInformation(valid.replace("<tds:Model>IP Camera</tds:Model>", ""))).toThrow();
  });
});
