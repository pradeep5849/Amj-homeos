/**
 * CCTV capability contract. A camera is not assumed to support live video,
 * recording, PTZ, two-way audio or NVR simply because HA exposes a camera entity.
 * Feature availability must be backed by a tested adapter/driver.
 */
export const CCTV_CAPABILITIES = Object.freeze([
  "snapshot", "live", "recordingSearch", "recordingPlayback",
  "ptz", "twoWayAudio", "motionEvents", "doorbellEvents",
]);
export function buildCameraCapabilities({ snapshot = false, adapter = null } = {}) {
  // The prototype has only a bounded still-image proxy. Do not claim
  // other capabilities until a trusted device-specific adapter is installed.
  return Object.fromEntries(CCTV_CAPABILITIES.map(key => [key, key === "snapshot" && snapshot === true]));
}
