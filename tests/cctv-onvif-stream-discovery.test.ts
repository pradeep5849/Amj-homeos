import { describe, expect, it, vi } from "vitest";
import { discoverOnvifStreams } from "../lib/cctv/onvif-stream-discovery";

const endpoint = { host: "192.168.1.30", onvifPort: 80, rtspPort: 554 };
const envelope = (body: string) => '<s:Envelope><s:Body>' + body + '</s:Body></s:Envelope>';
const profiles = envelope('<trt:GetProfilesResponse><trt:Profiles token="main"/></trt:GetProfilesResponse>');
const stream = envelope('<trt:GetStreamUriResponse><trt:MediaUri><tt:Uri>rtsp://192.168.1.30:554/live</tt:Uri></trt:MediaUri></trt:GetStreamUriResponse>');

describe("authenticated ONVIF stream discovery", () => {
  it("discovers and validates a profile stream using local requests", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(profiles, { status: 200 }))
      .mockResolvedValueOnce(new Response(stream, { status: 200 }));
    const found = await discoverOnvifStreams(endpoint, { username: "operator", password: "secret" }, fetcher as typeof fetch);
    expect(found).toEqual([{ profileToken: "main", rtspUri: "rtsp://192.168.1.30:554/live" }]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("rejects a stream returned for another camera", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(profiles))
      .mockResolvedValueOnce(new Response(stream.replace("192.168.1.30", "192.168.1.31")));
    await expect(discoverOnvifStreams(endpoint, { username: "operator", password: "secret" }, fetcher as typeof fetch))
      .rejects.toThrow();
  });
});
