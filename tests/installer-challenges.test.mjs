import { describe, it, expect } from "vitest";
import { createInstallerChallengeAuthority } from "../deploy/local-hub/installer-challenges.mjs";

describe("installer onboarding challenges", () => {
  it("requires explicit physical-presence verification", () => {
    const authority = createInstallerChallengeAuthority();
    expect(() => authority.issue()).toThrow("Physical presence required");
    expect(() => authority.issue({ physicalPresenceVerified: false })).toThrow();
  });
  it("issues one challenge at a time and consumes it only once", () => {
    const authority = createInstallerChallengeAuthority();
    const challenge = authority.issue({ physicalPresenceVerified: true });
    expect(() => authority.issue({ physicalPresenceVerified: true })).toThrow();
    expect(authority.consume(challenge.id, challenge.secret)).toBe(true);
    expect(authority.consume(challenge.id, challenge.secret)).toBe(false);
  });
  it("expires challenges and limits incorrect attempts", () => {
    let time = 100;
    const authority = createInstallerChallengeAuthority({ now: () => time, ttlMs: 1000 });
    const first = authority.issue({ physicalPresenceVerified: true });
    time += 1000;
    expect(authority.consume(first.id, first.secret)).toBe(false);
    const second = authority.issue({ physicalPresenceVerified: true });
    for (let i = 0; i < 5; i++) expect(authority.consume(second.id, "wrong")).toBe(false);
    expect(authority.consume(second.id, second.secret)).toBe(false);
  });
});
