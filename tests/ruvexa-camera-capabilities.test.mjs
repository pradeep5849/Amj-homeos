import { describe, expect, it } from "vitest";
import { ruvexaScript } from "../deploy/local-hub/ruvexa-preview.mjs";
describe("RUVEXA camera capability panel", () => {
  it("queries the scoped profile endpoint with customer session credentials", () => {
    expect(ruvexaScript).toContain('"/v1/cameras/profile?entityId="');
    expect(ruvexaScript).toContain('"X-AMJ-Session-ID": session.sessionId');
    expect(ruvexaScript).toContain('if (credentials !== session || !output.isConnected) return;');
  });
  it("distinguishes all three brands and does not claim unavailable operations", () => {
    for (const brand of ["hikvision", "cp_plus", "dahua"]) expect(ruvexaScript).toContain(brand);
    expect(ruvexaScript).toContain('"Not available"');
    expect(ruvexaScript).toContain('profile.capabilities ?? {}');
    expect(ruvexaScript).toContain('document.createElement("div")');
    expect(ruvexaScript).not.toContain('profileDetails.innerHTML');
  });
});
