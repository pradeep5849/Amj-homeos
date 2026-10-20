import { describe, expect, it, vi } from "vitest";
import { getServicesEnvelope, parseMediaServiceUrls, fetchMediaServiceUrls } from "../gateway/cctv/onvif-services.mjs";
const xml = `<s:Envelope><s:Body><tds:GetServicesResponse><tds:Service><tds:Namespace>http://www.onvif.org/ver10/media/wsdl</tds:Namespace><tds:XAddr>http://192.168.1.20/onvif/media</tds:XAddr></tds:Service><tds:Service><tds:Namespace>http://www.onvif.org/ver20/media/wsdl</tds:Namespace><tds:XAddr>http://192.168.1.20/onvif/media2</tds:XAddr></tds:Service><tds:Service><tds:Namespace>http://www.onvif.org/ver10/media/wsdl</tds:Namespace><tds:XAddr>http://evil.example/</tds:XAddr></tds:Service></tds:GetServicesResponse></s:Body></s:Envelope>`;
describe("ONVIF GetServices local discovery", () => {
  it("extracts only same-device Media1 and Media2 endpoints", () => {
    expect(parseMediaServiceUrls(xml, "192.168.1.20")).toEqual([
      { kind: "MEDIA1", url: "http://192.168.1.20/onvif/media" },
      { kind: "MEDIA2", url: "http://192.168.1.20/onvif/media2" },
    ]);
    expect(parseMediaServiceUrls(xml, "192.168.1.21")).toEqual([]);
  });
  it("supports signed GetServices SOAP header without exposing password", () => {
    const soap = getServicesEnvelope({ username: "operator", password: "secret" });
    expect(soap).toContain("GetServices");
    expect(soap).toContain("PasswordDigest");
    expect(soap).not.toContain(">secret<");
  });
  it("rejects redirects and fetches only validated device endpoints", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(xml, { status: 200 }));
    const result = await fetchMediaServiceUrls({ deviceServiceUrl: "http://192.168.1.20/onvif/device_service", sourceAddress: "192.168.1.20", fetchImpl });
    expect(result).toHaveLength(2);
    expect(fetchImpl.mock.calls[0][1].redirect).toBe("manual");
    fetchImpl.mockResolvedValueOnce(new Response(null, { status: 302 }));
    await expect(fetchMediaServiceUrls({ deviceServiceUrl: "http://192.168.1.20/onvif/device_service", sourceAddress: "192.168.1.20", fetchImpl })).rejects.toThrow("302");
  });
});
