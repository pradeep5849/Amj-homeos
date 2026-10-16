import type { AmjDiscoveredEntity } from "./mapping";

/**
 * Per-home registry reconciliation planning.
 * Pure functions: caller must persist atomically and enforce unique provider identity.
 * HA entity IDs are not globally unique: they must be scoped to a hub/HA instance.
 */
export type DeviceIdentity = {
  provider: string;
  instanceId: string;
  externalId: string;
};
export type RegistryDevice = {
  id: string;
  homeId: string;
  commandOwner: DeviceIdentity;
  identities: DeviceIdentity[];
};
export type RegistryPlan = {
  create: AmjDiscoveredEntity[];
  update: Array<{ deviceId: string; entity: AmjDiscoveredEntity }>;
  conflicts: Array<{ entity: AmjDiscoveredEntity; reason: string }>;
};

function key(identity: DeviceIdentity): string {
  return JSON.stringify([identity.provider, identity.instanceId, identity.externalId]);
}

export function reconcileHomeAssistantDevices(input: {
  homeId: string;
  instanceId: string;
  existing: RegistryDevice[];
  discovered: AmjDiscoveredEntity[];
}): RegistryPlan {
  const { homeId, instanceId, existing, discovered } = input;
  if (!homeId || !instanceId) throw new Error("Home and Home Assistant instance are required");
  const byIdentity = new Map<string, RegistryDevice>();
  const ambiguous = new Set<string>();
  for (const device of existing) {
    for (const identity of device.identities) {
      const identityKey = key(identity);
      if (byIdentity.has(identityKey) && byIdentity.get(identityKey)?.id !== device.id) ambiguous.add(identityKey);
      else byIdentity.set(identityKey, device);
    }
  }
  const plan: RegistryPlan = { create: [], update: [], conflicts: [] };
  const seen = new Set<string>();
  for (const entity of discovered) {
    if (entity.provider !== "HOME_ASSISTANT") continue;
    const identity: DeviceIdentity = { provider: "HOME_ASSISTANT", instanceId, externalId: entity.externalId };
    const identityKey = key(identity);
    if (seen.has(identityKey)) continue;
    seen.add(identityKey);
    if (ambiguous.has(identityKey)) {
      plan.conflicts.push({ entity, reason: "AMBIGUOUS_IDENTITY" });
      continue;
    }
    const match = byIdentity.get(identityKey);
    if (!match) {
      // No automatic cross-provider matching by name: require explicit physical-device linking.
      plan.create.push(entity);
      continue;
    }
    if (match.homeId !== homeId) {
      plan.conflicts.push({ entity, reason: "CROSS_HOME_IDENTITY" });
      continue;
    }
    if (key(match.commandOwner) !== identityKey) {
      plan.conflicts.push({ entity, reason: "COMMAND_OWNED_BY_ANOTHER_ADAPTER" });
      continue;
    }
    plan.update.push({ deviceId: match.id, entity });
  }
  return plan;
}

/** Command routing must reject an identity that is not the designated owner. */
export function assertHomeAssistantCommandOwner(
  device: RegistryDevice,
  homeId: string,
  instanceId: string,
  entityId: string,
): void {
  if (device.homeId !== homeId) throw new Error("Cross-home command rejected");
  if (key(device.commandOwner) !== key({
    provider: "HOME_ASSISTANT", instanceId, externalId: entityId,
  })) throw new Error("Home Assistant does not own this device");
}
