import { describe, expect, it } from "vitest";
import { RtspResponseFramer } from "../lib/cctv/rtsp-response-framer";

describe("RTSP incremental framing", () => {
  it("waits for complete headers and body", () => {
    const framer = new RtspResponseFramer();
    expect(framer.push(Buffer.from("RTSP/1.0 200 OK\r\nCSeq: 2\r\nContent-Length: 4\r\n\r\nAB"))).toEqual([]);
    const result = framer.push(Buffer.from("CD"));
    expect(result).toHaveLength(1);
    expect(result[0].sequence).toBe(2);
    expect(result[0].body.toString()).toBe("ABCD");
  });
  it("frames multiple responses received together", () => {
    const framer = new RtspResponseFramer();
    const response = "RTSP/1.0 200 OK\r\nCSeq: 1\r\n\r\n";
    expect(framer.push(Buffer.from(response + response))).toHaveLength(2);
  });
  it("rejects duplicate or oversized content length", () => {
    const framer = new RtspResponseFramer();
    expect(() => framer.push(Buffer.from(
      "RTSP/1.0 200 OK\r\nCSeq: 1\r\nContent-Length: 1\r\nContent-Length: 2\r\n\r\n",
    ))).toThrow();
  });
});
