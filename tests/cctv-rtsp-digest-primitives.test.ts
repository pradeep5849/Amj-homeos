import { describe, expect, it } from "vitest";
import { parseDigestChallenge, digestAuthorization } from "../lib/cctv/http-digest";

describe("RTSP Digest authentication primitives", () => {
  it("parses an RTSP Digest challenge with SHA-256", () => {
    const challenge = parseDigestChallenge('Digest realm="camera", nonce="abc123", algorithm=SHA-256, qop="auth"');
    expect(challenge).toEqual({ realm: "camera", nonce: "abc123", algorithm: "SHA-256", qop: "auth" });
  });

  it("creates method-bound authorization for an RTSP stream", () => {
    const challenge = parseDigestChallenge('Digest realm="camera", nonce="abc123", algorithm=MD5, qop="auth"');
    const describe = digestAuthorization({
      challenge, username: "viewer", password: "test-only",
      method: "DESCRIBE", uri: "rtsp://192.168.1.50/live",
      cnonce: "0123456789abcdef0123456789abcdef",
    });
    const setup = digestAuthorization({
      challenge, username: "viewer", password: "test-only",
      method: "SETUP", uri: "rtsp://192.168.1.50/track1",
      cnonce: "0123456789abcdef0123456789abcdef",
    });
    expect(describe).toContain("Digest username=");
    expect(describe).toContain('uri="rtsp://192.168.1.50/live"');
    expect(setup).not.toBe(describe);
    expect(describe).not.toContain("test-only");
  });

  it("rejects unsupported Digest qop", () => {
    expect(() => parseDigestChallenge('Digest realm="camera", nonce="abc", qop="auth-int"')).toThrow();
  });
});
