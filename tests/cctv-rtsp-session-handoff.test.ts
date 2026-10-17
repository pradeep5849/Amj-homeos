import { describe, expect, it } from "vitest";
import { RtspWireSession } from "../lib/cctv/rtsp-wire-session";

const response = (sequence: number, headers = "") =>
  Buffer.from("RTSP/1.0 200 OK\r\nCSeq: " + sequence + "\r\n" + headers + "\r\n");

describe("RTSP validated session handoff", () => {
  it("exposes the session only after a verified SETUP response", () => {
    const session = new RtspWireSession();
    expect(session.negotiatedSessionId).toBeNull();
    session.push(response(1));
    expect(session.negotiatedSessionId).toBeNull();
    session.push(response(2, "Session: camera123;timeout=60\r\nTransport: RTP/AVP/TCP;unicast;interleaved=0-1\r\n"));
    expect(session.state).toBe("PLAY");
    expect(session.negotiatedSessionId).toBe("camera123");
    session.push(response(3, "Session: camera123\r\n"));
    expect(session.negotiatedSessionId).toBe("camera123");
    session.close();
    expect(session.negotiatedSessionId).toBeNull();
  });
  it("never exposes a rejected session", () => {
    const session = new RtspWireSession();
    session.push(response(1));
    expect(() => session.push(response(2, "Session: camera123\r\nTransport: RTP/AVP;unicast\r\n"))).toThrow();
    expect(session.negotiatedSessionId).toBeNull();
  });
});
