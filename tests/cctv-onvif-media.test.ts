import { describe, expect, it, vi } from "vitest";
import { fetchMediaProfiles, getProfilesEnvelope, parseMediaProfiles, validateMediaServiceUrl } from "../gateway/cctv/onvif-media.mjs";
const xml = `<s:Envelope><s:Body><trt:GetProfilesResponse><trt:Profiles token="main"><tt:Name>Main stream</tt:Name></trt:Profiles><trt:Profiles token="sub"><tt:Name>Sub stream</tt:Name></trt:Profiles></trt:GetProfilesResponse></s:Body></s:Envelope>`;
describe("ONVIF local Media1 profiles", () => {
  it("uses GetProfiles SOAP and extracts bounded tokens", () => {
    expect(getProfilesEnvelope()).toContain("GetProfiles");
    expect(parseMediaProfiles(xml)).toEqual([{ token: "main", name: "Main stream" }, { token: "sub", name: "Sub stream" }]);
    expect(() => parseMediaProfiles("<s:Fault/>")).toThrow();
  });
  it("rejects unsafe network targets", () => {
    expect(() => validateMediaServiceUrl("http://8.8.8.8/onvif", "8.8.8.8")).toThrow();
    expect(() => validateMediaServiceUrl("http://192.168.1.21/onvif", "192.168.1.20")).toThrow();
    expect(() => validateMediaServiceUrl("http://admin:password@192.168.1.20/onvif", "192.168.1.20")).toThrow();
    expect(() => validateMediaServiceUrl("http://192.168.1.20:9999/onvif", "192.168.1.20")).toThrow();
  });
  it("POSTs locally and refuses redirects", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(xml, { status: 200 }));
    expect(await fetchMediaProfiles({ serviceUrl: "http://192.168.1.20/onvif/media", sourceAddress: "192.168.1.20", fetchImpl })).toHaveLength(2);
    expect(fetchImpl.mock.calls[0][1].redirect).toBe("manual");
    fetchImpl.mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "https://example.com" } }));
    await expect(fetchMediaProfiles({ serviceUrl: "http://192.168.1.20/onvif/media", sourceAddress: "192.168.1.20", fetchImpl })).rejects.toThrow("302");
  });
});
