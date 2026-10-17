import { describe, expect, it } from "vitest";
import { digestAuthorization, parseDigestChallenge } from "../lib/cctv/http-digest";

describe("gateway HTTP Digest authentication", () => {
  it("parses a SHA-256 challenge and generates a bounded auth header", () => {
    const challenge = parseDigestChallenge('Digest realm="camera", nonce="abc", algorithm=SHA-256, qop="auth,auth-int"');
    const authorization = digestAuthorization({
      challenge, username: "operator", password: "example",
      method: "POST", uri: "/onvif/device_service", cnonce: "a".repeat(32),
    });
    expect(authorization).toContain("algorithm=SHA-256");
    expect(authorization).toContain('uri="/onvif/device_service"');
    expect(authorization).toContain("qop=auth");
    expect(authorization).not.toContain("example");
  });
  it("rejects unsupported algorithms and challenge formats", () => {
    expect(() => parseDigestChallenge('Basic realm="camera"')).toThrow();
    expect(() => parseDigestChallenge('Digest realm="camera", nonce="abc", algorithm=SHA-512, qop="auth"')).toThrow();
    expect(() => parseDigestChallenge('Digest realm="camera", nonce="abc", qop="auth-int"')).toThrow();
  });
});
