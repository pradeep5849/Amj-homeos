import { describe, expect, it } from "vitest";
import { RtspWireSession } from "../lib/cctv/rtsp-wire-session";

const response = (cseq: number, extra = "") =>
  Buffer.from("RTSP/1.0 200 OK\r\nCSeq: " + cseq + "\r\n" + extra + "\r\n");
function media(channel: number, payload: Buffer) {
  const frame = Buffer.alloc(4 + payload.length);
  frame[0] = 0x24;
  frame[1] = channel;
  frame.writeUInt16BE(payload.length, 2);
  payload.copy(frame, 4);
  return frame;
}
const rtp = () => {
  const packet = Buffer.alloc(12);
  packet[0] = 0x80;
  packet[1] = 96;
  packet.writeUInt16BE(7, 2);
  packet.writeUInt32BE(90000, 4);
  return media(0, packet);
};
describe("combined RTSP TCP wire session", () => {
  it("negotiates and accepts RTP following PLAY on the same connection", () => {
    const session = new RtspWireSession();
    expect(session.push(response(1))).toEqual([{ type: "control", status: 200, sequence: 1 }]);
    expect(session.state).toBe("SETUP");
    session.push(response(2, "Session: session1\r\nTransport: RTP/AVP/TCP;unicast;interleaved=0-1\r\n"));
    expect(session.state).toBe("PLAY");
    const events = session.push(Buffer.concat([response(3, "Session: session1\r\n"), rtp()]));
    expect(events).toEqual([
      { type: "control", status: 200, sequence: 3 },
      { type: "rtp", sequence: 7, timestamp: 90000, payloadType: 96 },
    ]);
    expect(session.state).toBe("STREAMING");
  });
  it("rejects media before PLAY and closes", () => {
    const session = new RtspWireSession();
    expect(() => session.push(rtp())).toThrow();
    expect(session.state).toBe("CLOSED");
  });
  it("rejects a changed RTSP session ID", () => {
    const session = new RtspWireSession();
    session.push(response(1));
    session.push(response(2, "Session: session1\r\nTransport: RTP/AVP/TCP;interleaved=0-1\r\n"));
    expect(() => session.push(response(3, "Session: session2\r\n"))).toThrow();
    expect(session.state).toBe("CLOSED");
  });
  it("rejects incorrect response sequence", () => {
    const session = new RtspWireSession();
    expect(() => session.push(response(4))).toThrow();
    expect(session.state).toBe("CLOSED");
  });
});
