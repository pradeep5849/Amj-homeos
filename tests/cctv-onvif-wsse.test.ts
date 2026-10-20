import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { usernameToken, authenticatedGetProfilesEnvelope } from "../gateway/cctv/onvif-wsse.mjs";

describe("ONVIF WS-Security UsernameToken", () => {
  it("calculates PasswordDigest from raw nonce + timestamp + password", () => {
    const nonce = Buffer.alloc(16, 7);
    const now = new Date("2026-10-20T10:00:00.000Z");
    const xml = usernameToken({ username: "camera-user", password: "secret", now, nonce });
    const digest = createHash("sha1").update(nonce).update(now.toISOString()).update("secret").digest("base64");
    expect(xml).toContain(digest);
    expect(xml).toContain(nonce.toString("base64"));
    expect(xml).toContain("PasswordDigest");
    expect(xml).not.toContain(">secret<");
  });
  it("escapes XML metacharacters and places token in SOAP Header", () => {
    const xml = authenticatedGetProfilesEnvelope({ username: "admin<&", password: "secret" });
    expect(xml).toContain("admin&lt;&amp;");
    expect(xml).toContain("<s:Header>");
    expect(xml).toContain("<trt:GetProfiles/>");
  });
  it("rejects empty credentials and weak nonce", () => {
    expect(() => usernameToken({ username: "", password: "p" })).toThrow();
    expect(() => usernameToken({ username: "u", password: "" })).toThrow();
    expect(() => usernameToken({ username: "u", password: "p", nonce: Buffer.alloc(4) })).toThrow();
  });
});
