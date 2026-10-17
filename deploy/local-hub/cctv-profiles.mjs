// Conservative CCTV device profile contract. No live streams or recording
// controls are enabled without an installed, validated vendor adapter.
const BRANDS = new Set(["hikvision", "cp_plus", "dahua"]);
const ID = /^camera\.[a-z0-9_]+$/;
const FEATURES = ["snapshot", "live", "recordingSearch", "recordingPlayback", "ptz", "twoWayAudio", "motionEvents", "doorbellEvents"];
export function parseCctvProfiles(raw = "") {
  if (typeof raw !== "string" || raw.length > 8192) throw new Error("Invalid CCTV profiles");
  const profiles = new Map();
  if (!raw.trim()) return profiles;
  for (const part of raw.split(",")) {
    const pieces = part.trim().split(":");
    if (pieces.length !== 2) throw new Error("Invalid CCTV profile entry");
    const [id, brand] = pieces;
    if (!ID.test(id) || !BRANDS.has(brand) || profiles.has(id) || profiles.size >= 64)
      throw new Error("Invalid CCTV brand mapping");
    profiles.set(id, brand);
  }
  return profiles;
}
export function resolveCctvProfile(entityId, profiles, { snapshotAvailable = false } = {}) {
  if (typeof entityId !== "string" || !ID.test(entityId) || !(profiles instanceof Map))
    return null;
  const brand = profiles.get(entityId);
  if (!brand || !BRANDS.has(brand)) return null;
  const capabilities = Object.fromEntries(FEATURES.map(key => [key, key === "snapshot" && snapshotAvailable === true]));
  return { entityId, brand, adapterStatus: "not_configured", capabilities };
}
