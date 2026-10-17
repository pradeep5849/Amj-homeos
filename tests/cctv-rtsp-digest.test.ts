import { describe, expect, it } from "vitest";
import { rtspDigestRetry } from "../lib/cctv/rtsp-digest";

describe("RTSP Digest retry", () => {
  it("constructs an authenticated DESCRIBE request without exposing the password", () => {
    const request = rtspDigestRetry({
      authenticateHeader: 'Digest realm="camera", nonce="n1", qop="auth", algorithm=SHA-256',
      username: "viewer", password: "top-secret", method: "DESCRIBE",
      uri: "rtsp://192.168.1.10:554/live", cseq: 2,
    });
    expect(request).toContain("DESCRIBE rtsp://192.168.1.10:554/live RTSP/1.0");
    expect(request).toContain("Authorization: Digest ");
    expect(request).toContain("CSeq: 2");
    expect(request).not.toContain("top-secret");
  });
  it("rejects malformed URIs and sequence numbers", () => {
    const base = {
      authenticateHeader: 'Digest realm="camera", nonce="n1", qop="auth"',
      username: "viewer", password: "secret", method: "DESCRIBE" as const,
      uri: "rtsp://192.168.1.10/live", cseq: 2,
    };
    expect(() => rtspDigestRetry({ ...base, cseq: 0 })).toThrow();
    expect(() => rtspDigestRetry({ ...base, uri: "http://192.168.1.10/live" })).toThrow();
  });
});
