import { describe, expect, it } from "vitest";
import { RtspWireFramer } from "../lib/cctv/rtsp-wire-framer";

describe("RTSP wire parser hardening", () => {
  it("buffers a fragmented RTSP response body", () => {
    const parser = new RtspWireFramer();
    const message = Buffer.from("RTSP/1.0 200 OK\r\nCSeq: 1\r\nContent-Length: 4\r\n\r\nSDP!");
    expect(parser.push(message.subarray(0, message.length - 2))).toEqual([]);
    const result = parser.push(message.subarray(message.length - 2));
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe("response");
    if (result[0].kind === "response") expect(result[0].body.toString()).toBe("SDP!");
  });

  it("rejects duplicate content-length headers", () => {
    const parser = new RtspWireFramer();
    expect(() => parser.push(Buffer.from(
      "RTSP/1.0 200 OK\r\nContent-Length: 0\r\ncontent-length: 0\r\n\r\n",
    ))).toThrow("Duplicate");
  });

  it("rejects malformed RTSP status and excessive media frames", () => {
    expect(() => new RtspWireFramer().push(Buffer.from("HTTP/1.1 200 OK\r\n\r\n"))).toThrow();
    expect(() => new RtspWireFramer().push(Buffer.from([0x24, 0, 0x80, 0x01]))).toThrow();
  });

  it("retains an incomplete interleaved frame until all bytes arrive", () => {
    const parser = new RtspWireFramer();
    expect(parser.push(Buffer.from([0x24, 0, 0, 3, 1]))).toEqual([]);
    const result = parser.push(Buffer.from([2, 3]));
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ kind: "interleaved", channel: 0, payload: Buffer.from([1, 2, 3]) });
  });
});
