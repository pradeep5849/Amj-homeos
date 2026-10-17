import { describe, expect, it } from "vitest";
import { inspectRtpPacket } from "../lib/cctv/rtsp-interleaved";

describe("RTP variable header validation", () => {
  it("accepts fixed RTP header", () => {
    const packet = Buffer.alloc(15);
    packet[0] = 0x80;
    packet[1] = 96;
    expect(inspectRtpPacket(packet)).toMatchObject({
      headerSize: 12, payloadLength: 3, payloadType: 96,
    });
  });

  it("skips CSRC identifiers and RTP extension words", () => {
    const packet = Buffer.alloc(12 + 4 + 4 + 8 + 2);
    packet[0] = 0x91;
    packet[16] = 0xbe;
    packet[17] = 0xde;
    packet[18] = 0;
    packet[19] = 2;
    expect(inspectRtpPacket(packet)).toMatchObject({
      headerSize: 28, payloadLength: 2,
    });
  });

  it("excludes RTP padding from the payload", () => {
    const packet = Buffer.alloc(18);
    packet[0] = 0xa0;
    packet[17] = 4;
    expect(inspectRtpPacket(packet)).toMatchObject({
      headerSize: 12, payloadLength: 2,
    });
  });

  it("rejects truncated extensions and invalid padding", () => {
    const extension = Buffer.alloc(16);
    extension[0] = 0x90;
    extension[14] = 0;
    extension[15] = 3;
    expect(() => inspectRtpPacket(extension)).toThrow("Truncated RTP extension");
    const padding = Buffer.alloc(12);
    padding[0] = 0xa0;
    expect(() => inspectRtpPacket(padding)).toThrow("Invalid RTP padding");
  });
});
