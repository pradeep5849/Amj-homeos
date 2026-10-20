import { describe, expect, it } from "vitest";
import { discoveryProbe, parseDiscoveryResponse, discoverOnvif } from "../gateway/cctv/onvif-discovery.mjs";
const xml = (x: string) => `<e:Envelope><e:Body><d:ProbeMatches><d:ProbeMatch><d:XAddrs>${x}</d:XAddrs></d:ProbeMatch></d:ProbeMatches></e:Body></e:Envelope>`;
describe("local ONVIF WS-Discovery", () => {
  it("creates a network video transmitter probe", () => {
    expect(discoveryProbe()).toContain("NetworkVideoTransmitter");
    expect(discoveryProbe()).toContain("Probe");
  });
  it("accepts same-source private device service URLs", () => {
    expect(parseDiscoveryResponse(xml("http://192.168.1.20/onvif/device_service"), "192.168.1.20"))
      .toEqual(["http://192.168.1.20/onvif/device_service"]);
  });
  it("rejects off-device endpoints, public addresses, credentials and non-http schemes", () => {
    expect(parseDiscoveryResponse(xml("http://example.com/onvif http://192.168.1.21/onvif"), "192.168.1.20")).toEqual([]);
    expect(parseDiscoveryResponse(xml("http://192.168.1.20/onvif"), "8.8.8.8")).toEqual([]);
    expect(parseDiscoveryResponse(xml("http://admin:pass@192.168.1.20/onvif ftp://192.168.1.20/onvif"), "192.168.1.20")).toEqual([]);
    expect(parseDiscoveryResponse(xml("http://192.168.1.20/onvif"), "192.168.1.999")).toEqual([]);
    expect(parseDiscoveryResponse("<xml>hello</xml>", "192.168.1.20")).toEqual([]);
  });
  it("validates discovery timeouts without opening sockets", async () => {
    await expect(discoverOnvif({ timeoutMs: 20 })).rejects.toThrow();
  });
});
