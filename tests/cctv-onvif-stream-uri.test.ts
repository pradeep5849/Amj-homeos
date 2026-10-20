import { describe, expect, it, vi } from "vitest";
import { getStreamUriEnvelope, parseStreamUriResponse, fetchStreamUri } from "../gateway/cctv/onvif-stream-uri.mjs";
const xml = (uri: string) => `<s:Envelope><s:Body><trt:GetStreamUriResponse><trt:MediaUri><tt:Uri>${uri}</tt:Uri></trt:MediaUri></trt:GetStreamUriResponse></s:Body></s:Envelope>`;
describe("local ONVIF Media1 GetStreamUri", () => {
  it("requests RTSP unicast with the selected profile and WS-Security", () => {
    const soap = getStreamUriEnvelope({ profileToken: "main", credentials: { username: "camera", password: "secret" } });
    expect(soap).toContain("GetStreamUri");
    expect(soap).toContain("RTP-Unicast");
    expect(soap).toContain("<trt:ProfileToken>main</trt:ProfileToken>");
    expect(soap).toContain("PasswordDigest");
    expect(soap).not.toContain(">secret<");
  });
  it("validates same-device RTSP URI and rejects credentials, remote hosts, SOAP faults", () => {
    expect(parseStreamUriResponse(xml("rtsp://192.168.1.20:554/Streaming/Channels/101"), "192.168.1.20"))
      .toEqual({ uri: "rtsp://192.168.1.20:554/Streaming/Channels/101", host: "192.168.1.20", port: 554 });
    expect(() => parseStreamUriResponse(xml("rtsp://8.8.8.8/stream"), "192.168.1.20")).toThrow();
    expect(() => parseStreamUriResponse(xml("rtsp://user:pass@192.168.1.20/stream"), "192.168.1.20")).toThrow();
    expect(() => parseStreamUriResponse("<s:Fault/>", "192.168.1.20")).toThrow();
  });
  it("posts to local media service, refuses redirects", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(xml("rtsp://192.168.1.20/live"), { status: 200 }));
    expect((await fetchStreamUri({ mediaServiceUrl: "http://192.168.1.20/onvif/media", sourceAddress: "192.168.1.20", profileToken: "main", fetchImpl })).port).toBe(554);
    expect(fetchImpl.mock.calls[0][1].redirect).toBe("manual");
    fetchImpl.mockResolvedValueOnce(new Response(null, { status: 302 }));
    await expect(fetchStreamUri({ mediaServiceUrl: "http://192.168.1.20/onvif/media", sourceAddress: "192.168.1.20", profileToken: "main", fetchImpl })).rejects.toThrow("302");
  });
});
