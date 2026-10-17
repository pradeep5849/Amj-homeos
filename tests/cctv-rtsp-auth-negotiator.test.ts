import { describe, expect, it } from "vitest";
import { RtspAuthenticatedNegotiator } from "../lib/cctv/rtsp-auth-negotiator";

const reply = (status: number, sequence: number, extra = "") =>
  "RTSP/1.0 " + status + (status === 401 ? " Unauthorized" : " OK") +
  "\r\nCSeq: " + sequence + "\r\n" + extra;
const challenge = 'WWW-Authenticate: Digest realm="camera", nonce="abc123", algorithm=SHA-256, qop="auth"\r\n';

const make = () => new RtspAuthenticatedNegotiator(
  "rtsp://192.168.1.50/live",
  "rtsp://192.168.1.50/track1",
  { username: "viewer", password: "example-password" },
);

describe("RTSP authenticated negotiation", () => {
  it("retries DESCRIBE once and preserves SETUP and PLAY headers", () => {
    const session = make();
    const first = session.start();
    expect(first.sequence).toBe(1);
    const retried = session.acceptResponse(reply(401, 1, challenge));
    expect(retried?.sequence).toBe(2);
    expect(retried?.method).toBe("DESCRIBE");
    expect(retried?.headers).toContain("Authorization: Digest ");
    const setup = session.acceptResponse(reply(200, 2));
    expect(setup?.sequence).toBe(3);
    expect(setup?.headers).toContain("interleaved=0-1");
    const play = session.acceptResponse(reply(200, 3,
      "Session: s123\r\nTransport: RTP/AVP/TCP;unicast;interleaved=0-1\r\n"));
    expect(play?.method).toBe("PLAY");
    expect(play?.headers).toContain("Session: s123\r\n");
    expect(session.acceptResponse(reply(200, 4, "Session: s123\r\n"))).toBeNull();
  });

  it("rejects a second challenge for the same request", () => {
    const session = make();
    session.start();
    session.acceptResponse(reply(401, 1, challenge));
    expect(() => session.acceptResponse(reply(401, 2, challenge))).toThrow("retry exhausted");
  });

  it("rejects mismatched sequence numbers", () => {
    const session = make();
    session.start();
    expect(() => session.acceptResponse(reply(200, 9))).toThrow("sequence mismatch");
  });
});
