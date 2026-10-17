import { describe, expect, it } from "vitest";
import { RtspDigestRetry } from "../lib/cctv/rtsp-digest-retry-state";

const credentials = { username: "viewer", password: "sample-only" };
const uri = "rtsp://192.168.1.50/live";
const challenge = (sequence: number) =>
  "RTSP/1.0 401 Unauthorized\r\nCSeq: " + sequence +
  '\r\nWWW-Authenticate: Digest realm="camera", nonce="n1", algorithm=SHA-256, qop="auth"\r\n';

describe("RTSP Digest retry state", () => {
  it("authorizes one correctly sequenced camera challenge", () => {
    const retry = new RtspDigestRetry("DESCRIBE", uri, credentials);
    const authorization = retry.authorization(challenge(1), 1);
    expect(authorization).toContain("Digest username=");
    expect(authorization).not.toContain(credentials.password);
    expect(() => retry.authorization(challenge(2), 2)).toThrow("retry exhausted");
  });
  it("rejects unexpected CSeq without consuming retry", () => {
    const retry = new RtspDigestRetry("DESCRIBE", uri, credentials);
    expect(() => retry.authorization(challenge(5), 1)).toThrow();
    expect(retry.authorization(challenge(1), 1)).toContain("Digest");
  });
  it("rejects missing authentication challenges", () => {
    const retry = new RtspDigestRetry("DESCRIBE", uri, credentials);
    expect(() => retry.authorization("RTSP/1.0 401 Unauthorized\r\nCSeq: 1\r\n", 1)).toThrow();
  });
});
