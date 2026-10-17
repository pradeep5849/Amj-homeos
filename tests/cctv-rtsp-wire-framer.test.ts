import { describe, expect, it } from "vitest";
import { RtspWireFramer } from "../lib/cctv/rtsp-wire-framer";

function packet(channel: number, data: Buffer) {
  const frame = Buffer.alloc(4 + data.length);
  frame[0] = 0x24;
  frame[1] = channel;
  frame.writeUInt16BE(data.length, 2);
  data.copy(frame, 4);
  return frame;
}

describe("RTSP shared TCP wire framing", () => {
  it("handles fragmented control responses and media frames", () => {
    const framer = new RtspWireFramer();
    const response = Buffer.from("RTSP/1.0 200 OK\r\nCSeq: 3\r\n\r\n");
    const rtp = packet(0, Buffer.from([0x80, 0x60, 0, 1]));
    expect(framer.push(response.subarray(0, 8))).toEqual([]);
    const first = framer.push(response.subarray(8));
    expect(first).toHaveLength(1);
    expect(first[0].kind).toBe("response");
    expect(framer.push(rtp.subarray(0, 2))).toEqual([]);
    const second = framer.push(rtp.subarray(2));
    expect(second).toHaveLength(1);
    expect(second[0].kind).toBe("interleaved");
  });
  it("handles a response followed immediately by media", () => {
    const framer = new RtspWireFramer();
    const response = Buffer.from("RTSP/1.0 200 OK\r\nCSeq: 3\r\n\r\n");
    const frames = framer.push(Buffer.concat([response, packet(1, Buffer.from([1, 2]))]));
    expect(frames.map(frame => frame.kind)).toEqual(["response", "interleaved"]);
  });
  it("rejects oversized declared response bodies", () => {
    const framer = new RtspWireFramer();
    expect(() => framer.push(Buffer.from("RTSP/1.0 200 OK\r\nContent-Length: 999999\r\n\r\n"))).toThrow();
  });
});
