import { describe, expect, it } from "vitest";
import { CCTV_ADAPTERS, unverifiedCapabilities } from "../lib/cctv/adapters";

describe("CCTV vendor-neutral capability contracts", () => {
  it("keeps unknown and unverified features disabled", () => {
    expect(unverifiedCapabilities()).toEqual({
      live: false, recordings: false, ptz: false, audio: false, snapshots: false,
    });
  });
  it("does not claim live compatibility without probing", () => {
    for (const adapter of Object.values(CCTV_ADAPTERS)) {
      expect(["PROBE_REQUIRED", "UNSUPPORTED"]).toContain(adapter.mode);
    }
  });
  it("keeps unsupported brands from advertising device protocols", () => {
    expect(CCTV_ADAPTERS.EZVIZ.protocols).toEqual([]);
    expect(CCTV_ADAPTERS.OTHER.protocols).toEqual([]);
  });
});
