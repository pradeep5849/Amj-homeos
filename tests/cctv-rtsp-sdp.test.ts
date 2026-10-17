import { describe, expect, it } from "vitest";
import { hasH264VideoMedia, parseRtspSdp } from "../lib/cctv/rtsp-sdp";

const h264 = "v=0\r\no=- 0 0 IN IP4 192.168.1.20\r\ns=Camera\r\nt=0 0\r\nm=video 0 RTP/AVP 96\r\na=rtpmap:96 H264/90000\r\n";
describe("RTSP SDP parsing", () => {
  it("detects an advertised H264 RTP media description", () => {
    expect(hasH264VideoMedia(h264)).toBe(true);
    expect(parseRtspSdp(h264)[0].codecs[0].encoding).toBe("H264");
  });
  it("does not treat unsupported codecs as H264", () => {
    expect(hasH264VideoMedia(h264.replace("H264", "H265"))).toBe(false);
  });
  it("rejects oversized and malformed SDP", () => {
    expect(() => parseRtspSdp("x".repeat(32769))).toThrow();
    expect(() => parseRtspSdp("v=0\r\nm=video 99999 RTP/AVP 256")).toThrow();
  });
});
