import type { HomeAssistantClient } from "./client";
import { mapHomeAssistantStates, type AmjDiscoveredEntity } from "./mapping";

/**
 * Read-only discovery preview for AMJ Universal Hub.
 * No automatic pairing, registration, cloud dependency or switch firmware changes.
 * Only entities exposed by the locally configured Home Assistant are inspected.
 */
export async function previewHomeAssistantDevices(
  client: Pick<HomeAssistantClient, "listStates">,
): Promise<{
  supported: AmjDiscoveredEntity[];
  skippedCount: number;
}> {
  const states = await client.listStates();
  const supported = mapHomeAssistantStates(states);
  const supportedIds = new Set(supported.map((item) => item.externalId));
  return {
    supported,
    skippedCount: states.filter((state) => !supportedIds.has(state.entity_id)).length,
  };
}

/**
 * Installer approval is mandatory before registration. The physical transport must
 * be verified independently; an HA entity ID never proves a device uses Zigbee.
 */
export function assertInstallerApprovedDevice(input: {
  entity: AmjDiscoveredEntity;
  approvedEntityId: string;
  verifiedProtocol: "ZIGBEE" | "WIFI" | "TUYA";
  installerApproved: boolean;
}): void {
  if (!input.installerApproved || input.approvedEntityId !== input.entity.externalId) {
    throw new Error("Explicit installer approval is required");
  }
  if (!["ZIGBEE", "WIFI", "TUYA"].includes(input.verifiedProtocol)) {
    throw new Error("Physical protocol must be verified");
  }
}
