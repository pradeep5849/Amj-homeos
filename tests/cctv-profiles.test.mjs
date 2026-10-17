import { describe, expect, it } from "vitest";
import { parseCctvProfiles, resolveCctvProfile } from "../deploy/local-hub/cctv-profiles.mjs";
describe("CCTV brand profiles", () => {
  it("supports all three brands without claiming unavailable functions", () => {
    const profiles = parseCctvProfiles("camera.front:hikvision,camera.gate:cp_plus,camera.back:dahua");
    expect(profiles.size).toBe(3);
    for (const [id, brand] of profiles) {
      const profile = resolveCctvProfile(id, profiles, { snapshotAvailable: true });
      expect(profile.brand).toBe(brand);
      expect(profile.adapterStatus).toBe("not_configured");
      expect(profile.capabilities).toMatchObject({
        snapshot: true, live: false, recordingSearch: false, recordingPlayback: false,
        ptz: false, twoWayAudio: false, motionEvents: false, doorbellEvents: false,
      });
    }
    expect(resolveCctvProfile("camera.other", profiles)).toBeNull();
  });
  it("rejects malformed or duplicate profiles", () => {
    for (const raw of ["camera.front:unknown", "camera.front:hikvision,camera.front:dahua",
      "lock.front:hikvision", "camera.front:hikvision:extra", "camera.front:hikvision,",
      "camera.front:HIKVISION", "camera.front:hikvision\n"]) {
      expect(() => parseCctvProfiles(raw)).toThrow();
    }
  });
});
