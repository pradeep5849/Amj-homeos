import { describe, expect, it } from "vitest";
import { parseRecordingSearch } from "../deploy/local-hub/cctv-recording-search.mjs";
const now = Date.parse("2026-10-17T10:00:00Z");
const allowlist = new Set(["camera.front"]);
const valid = { entityId: "camera.front", start: "2026-10-17T08:00:00Z", end: "2026-10-17T09:00:00Z" };
describe("NVR recording search validation", () => {
  it("accepts bounded UTC windows only for granted cameras", () => {
    expect(parseRecordingSearch(valid, allowlist, now)).toEqual({
      ...valid, start: "2026-10-17T08:00:00.000Z", end: "2026-10-17T09:00:00.000Z",
    });
  });
  it("rejects broad, malformed, future or ungranted requests", () => {
    for (const bad of [
      { ...valid, entityId: "camera.private" },
      { ...valid, entityId: "lock.front" },
      { ...valid, start: "2026-10-15T08:00:00Z" },
      { ...valid, end: "2026-10-17T12:00:00Z" },
      { ...valid, end: valid.start },
      { ...valid, start: "2026-10-17 08:00:00" },
      { ...valid, start: "not a date" },
      { ...valid, extra: true },
      null,
    ]) expect(parseRecordingSearch(bad, allowlist, now)).toBeNull();
  });
});
