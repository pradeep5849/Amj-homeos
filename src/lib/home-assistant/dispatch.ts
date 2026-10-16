import type { PrismaClient } from "@prisma/client";
import { HomeAssistantClient } from "./client";
import { mapAmjCommandToHa } from "./mapping";
import { resolveHomeAssistantCommandTarget } from "./persistence";

/**
 * Server-side hub command boundary. Caller MUST authenticate/authorize user and home
 * before invoking. The HA access token never passes through the customer-facing API.
 * HA accepting a service call is not proof the physical device reached the target state.
 */
export async function dispatchHomeAssistantCommand(
  db: PrismaClient,
  client: Pick<HomeAssistantClient, "callService" | "getState">,
  input: {
    homeId: string;
    instanceId: string;
    deviceId: string;
    command: "setPower" | "setBrightness" | "setSpeed";
    value: unknown;
  },
): Promise<{
  accepted: true;
  entityId: string;
  reportedState: string | null;
}> {
  const entityId = await resolveHomeAssistantCommandTarget(db, input);
  const request = mapAmjCommandToHa(entityId, input.command, input.value);
  await client.callService(request.domain, request.service, request.entityId, request.data);
  // State is informational only; never report a confirmed physical action.
  let reportedState: string | null = null;
  try {
    const current = await client.getState(entityId);
    reportedState = current.state;
  } catch {
    // Command accepted, but immediate readback unavailable.
  }
  return { accepted: true, entityId, reportedState };
}
