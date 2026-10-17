import { describe, expect, it } from "vitest";
import { rtspMethodHeaders } from "../lib/cctv/rtsp-method-headers";

describe("RTSP method-specific headers", () => {
  it("includes SDP Accept on DESCRIBE", () => {
    expect(rtspMethodHeaders("DESCRIBE")).toContain("Accept: application/sdp\r\n");
  });
  it("requests interleaved TCP transport on SETUP", () => {
    expect(rtspMethodHeaders("SETUP")).toContain("interleaved=0-1");
  });
  it("requires the negotiated session on PLAY and TEARDOWN", () => {
    expect(() => rtspMethodHeaders("PLAY")).toThrow();
    expect(() => rtspMethodHeaders("TEARDOWN")).toThrow();
    expect(rtspMethodHeaders("PLAY", "session123")).toContain("Session: session123\r\n");
    expect(rtspMethodHeaders("TEARDOWN", "session123")).toContain("Session: session123\r\n");
  });
  it("rejects CRLF injection in session identifiers", () => {
    expect(() => rtspMethodHeaders("PLAY", "ok\r\nInjected: yes")).toThrow();
  });
});
