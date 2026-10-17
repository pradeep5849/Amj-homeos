import { buildCameraCapabilities } from "./cctv-capabilities.mjs";
// Convert authorized Home Assistant discovery into a stable, UI-ready inventory snapshot.
// Never return raw HA attributes or authorize controls based on UI capability hints.
export function buildInventorySnapshot(devices, { generatedAt = new Date().toISOString() } = {}) {
  if (!Array.isArray(devices) || devices.length > 1000) throw new Error("Invalid inventory");
  const summary = {
    total: devices.length, online: 0, offline: 0, unknown: 0,
    lighting: 0, switches: 0, fans: 0, sensors: 0, curtains: 0, security: 0, cameras: 0,
  };
  const allowed = new Set(["lighting", "switches", "fans", "sensors", "curtains", "security", "cameras"]);
  const items = devices.map((device) => {
    if (!device || typeof device.entityId !== "string" ||
        !allowed.has(device.category) ||
        !["online", "offline", "unknown"].includes(device.availabilityStatus)) {
      throw new Error("Invalid device");
    }
    summary[device.availabilityStatus]++;
    summary[device.category]++;
    return {
      id: device.entityId,
      name: device.displayName ?? device.name ?? device.entityId,
      category: device.category,
      availability: device.availabilityStatus,
      state: device.state,
      isOn: device.isOn ?? null,
      canToggle: device.canToggle === true,
      unit: device.unit ?? null,
      deviceClass: device.deviceClass ?? null,
      readOnly: device.isReadOnly === true,
      supportsFanSpeed: device.supportsFanSpeed === true,
      fanSpeedPercentage: device.fanSpeedPercentage ?? null,
      fanSpeedStages: device.fanSpeedStages ?? null,
      fanSpeedMode: device.fanSpeedMode ?? null,
      fanSpeedStage: device.fanSpeedStage ?? null,
      curtainActions: device.category === "curtains" ? device.curtainActions ?? null : null,
      curtainPositionSupported: device.category === "curtains" && device.curtainPositionSupported === true,
      curtainPosition: device.category === "curtains" ? device.curtainPosition ?? null : null,
      cameraCapabilities: device.category === "cameras" ? buildCameraCapabilities({ snapshot: device.availabilityStatus === "online" }) : null,
    };
  });
  return { generatedAt, count: items.length, summary, devices: items, readOnly: true };
}
