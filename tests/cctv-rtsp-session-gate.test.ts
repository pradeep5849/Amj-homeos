import { describe, expect, it } from "vitest";
import { RtspSessionGate } from "../lib/cctv/rtsp-session-gate";

const response = (sequence: number, extra = "") =>
  Buffer.from("RTSP/1.0 200 OK\r\nCSeq: " + sequence + "\r\n" + extra + "\r\n");
const mediaFrame = () => {
  const rtp = Buffer.alloc(12);
  rtp[0] = 0x80;
  rtp[1] = 96;
  rtp.writeUInt16BE(42, 2);
  const frame = Buffer.alloc(4 + rtp.length);
  frame[0] = 0x24;
  frame[1] = 0;
  frame.writeUInt16BE(rtp.length, 2);
  rtp.copy(frame, 4);
  return frame;
};

describe("RTSP session protocol gate", () => {
  it("permits RTP only after DESCRIBE, SETUP and PLAY", () => {
    const gate = new RtspSessionGate();
    expect(() => gate.acceptMediaBytes(mediaFrame())).toThrow();
    gate.acceptResponseBytes(response(1));
    expect(gate.state).toBe("SETUP");
    gate.acceptResponseBytes(response(2,
      "Session: sess1\r\nTransport: RTP/AVP/TCP;unicast;interleaved=0-1\r\n"));
    expect(gate.state).toBe("PLAY");
    gate.acceptResponseBytes(response(3, "Session: sess1\r\n"));
    expect(gate.state).toBe("STREAMING");
    expect(gate.acceptMediaBytes(mediaFrame())).toEqual([
      { type: "rtp", sequence: 42, timestamp: 0, payloadType: 96 },
    ]);
  });
  it("fails closed on mismatched sequence", () => {
    const gate = new RtspSessionGate();
    expect(() => gate.acceptResponseBytes(response(5))).toThrow();
    expect(gate.state).toBe("CLOSED");
  });
  it("fails closed if SETUP does not confirm interleaved transport", () => {
    const gate = new RtspSessionGate();
    gate.acceptResponseBytes(response(1));
    expect(() => gate.acceptResponseBytes(response(2, "Session: sess1\r\nTransport: RTP/AVP;unicast\r\n"))).toThrow();
    expect(gate.state).toBe("CLOSED");
  });
});
