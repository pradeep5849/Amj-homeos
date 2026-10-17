// Vendor adapters must expose a capability-tested interface. The registry
// deliberately contains NO working media adapters until model verification.
export const CCTV_BRANDS = Object.freeze(["hikvision", "cp_plus", "dahua"]);
export const CCTV_OPERATIONS = Object.freeze([
  "discover", "snapshot", "live", "recordingSearch", "recordingPlayback",
  "ptz", "twoWayAudio", "motionEvents", "doorbellEvents",
]);
const CAMERA = /^camera\.[a-z0-9_]+$/;
const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);
export function validateCctvAdapter(adapter) {
  if (!isObject(adapter) || !CCTV_BRANDS.includes(adapter.brand) ||
      typeof adapter.model !== "string" || !/^[A-Za-z0-9._ -]{1,80}$/.test(adapter.model) ||
      typeof adapter.firmware !== "string" || !/^[A-Za-z0-9._ -]{1,80}$/.test(adapter.firmware) ||
      !isObject(adapter.capabilities)) return false;
  if (Object.keys(adapter.capabilities).sort().join(",") !==
      [...CCTV_OPERATIONS].sort().join(",")) return false;
  for (const operation of CCTV_OPERATIONS) {
    if (typeof adapter.capabilities[operation] !== "boolean") return false;
    if (adapter.capabilities[operation] && typeof adapter[operation] !== "function") return false;
  }
  return true;
}
export function createCctvAdapterRegistry() {
  const adapters = new Map();
  return Object.freeze({
    register(entityId, adapter) {
      if (typeof entityId !== "string" || !CAMERA.test(entityId) ||
          !validateCctvAdapter(adapter) || adapters.has(entityId))
        throw new Error("Invalid or duplicate CCTV adapter");
      adapters.set(entityId, adapter);
    },
    capability(entityId, operation) {
      const adapter = adapters.get(entityId);
      return CCTV_OPERATIONS.includes(operation) && adapter?.capabilities[operation] === true;
    },
    getPublicProfile(entityId) {
      const adapter = adapters.get(entityId);
      if (!adapter) return null;
      return { entityId, brand: adapter.brand, model: adapter.model, firmware: adapter.firmware,
        capabilities: { ...adapter.capabilities } };
    },
  });
}
