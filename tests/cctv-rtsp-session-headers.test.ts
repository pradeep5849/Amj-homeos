import { describe, expect, it } from "vitest";
import { parseRtspSessionHeaders } from "../lib/cctv/rtsp-session-headers";

describe("RTSP session headers", () => {
  it("extracts a successful SETUP response", () => {
    expect(parseRtspSessionHeaders(
      "RTSP/1.0 200 OK\r\nCSeq: 3\r\nSession: abc123;timeout=60\r\nTransport: RTP/AVP/TCP;unicast;interleaved=0-1\r\n",
    )).toEqual({
      status: 200, sequence: 3, session: "abc123",
      transport: "RTP/AVP/TCP;unicast;interleaved=0-1",
    });
  });
  it("rejects missing sequence and duplicate headers", () => {
    expect(() => parseRtspSessionHeaders("RTSP/1.0 200 OK\r\nSession: abc\r\n")).toThrow();
    expect(() => parseRtspSessionHeaders("RTSP/1.0 200 OK\r\nCSeq: 2\r\nCSeq: 3\r\n")).toThrow();
  });
  it("rejects oversized headers", () => {
    expect(() => parseRtspSessionHeaders("x".repeat(8193))).toThrow();
  });
});
