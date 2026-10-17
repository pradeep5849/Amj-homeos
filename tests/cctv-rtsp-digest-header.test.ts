import { describe, expect, it } from "vitest";
import { rtspDigestHeader } from "../lib/cctv/rtsp-digest-header";

describe("RTSP method-bound Digest header", () => {
  const challenge = 'Digest realm="camera", nonce="nonce1", algorithm=SHA-256, qop="auth"';
  const credentials = { username: "viewer", password: "example-secret" };
  it("builds an authorization value without exposing the password", () => {
    const value = rtspDigestHeader({
      challenge, credentials, method: "DESCRIBE",
      uri: "rtsp://192.168.1.50/live",
    });
    expect(value).toContain("Digest username=");
    expect(value).toContain("algorithm=SHA-256");
    expect(value).not.toContain(credentials.password);
  });
  it("rejects header injection in RTSP URIs", () => {
    expect(() => rtspDigestHeader({
      challenge, credentials, method: "PLAY",
      uri: "rtsp://192.168.1.50/live\r\nX-Test: yes",
    })).toThrow("Invalid RTSP URI");
  });
  it("rejects unsupported challenges", () => {
    expect(() => rtspDigestHeader({
      challenge: 'Basic realm="camera"', credentials,
      method: "SETUP", uri: "rtsp://192.168.1.50/track1",
    })).toThrow();
  });
});
