import type { DeviceProtocol, DeviceType, OnboardingStatus, OnboardingType, Prisma, ProvisioningProvider, Role } from "@prisma/client";
import { prisma } from "./db";
import { HttpError } from "./errors";
import { homeAccess } from "./homes";
import type { AdoptedDevice, ProviderResult } from "./provisioning";

type Actor = { id: string; role: Role };
export const sessionSelect = { id: true, homeId: true, roomId: true, onboardingType: true, protocol: true, status: true, provider: true, discoveredIdentifier: true, expiresAt: true, createdAt: true, updatedAt: true } as const;
const protocol: Record<OnboardingType, DeviceProtocol> = { WIFI_BLE: "WIFI", ZIGBEE_GATEWAY: "ZIGBEE", TUYA: "TUYA", GATEWAY: "ZIGBEE" };

export const onboardingTransitions: Readonly<Record<OnboardingStatus, readonly OnboardingStatus[]>> = {
  IDLE: ["PERMISSION_REQUIRED", "SCANNING", "CANCELLED", "EXPIRED", "UNSUPPORTED", "NOT_CONFIGURED"],
  PERMISSION_REQUIRED: ["BLUETOOTH_DISABLED", "SCANNING", "CANCELLED", "EXPIRED", "UNSUPPORTED", "NOT_CONFIGURED"],
  BLUETOOTH_DISABLED: ["PERMISSION_REQUIRED", "CANCELLED", "EXPIRED"],
  SCANNING: ["DEVICE_FOUND", "FAILED", "CANCELLED", "EXPIRED", "UNSUPPORTED", "NOT_CONFIGURED"],
  DEVICE_FOUND: ["DEVICE_SELECTED", "SCANNING", "CANCELLED", "EXPIRED"],
  DEVICE_SELECTED: ["PROVISIONING", "CANCELLED", "EXPIRED"],
  PROVISIONING: ["WAITING_FOR_NETWORK", "REGISTERING", "FAILED", "CANCELLED", "EXPIRED", "NOT_CONFIGURED"],
  WAITING_FOR_NETWORK: ["REGISTERING", "FAILED", "CANCELLED", "EXPIRED"],
  REGISTERING: ["SUCCESS", "FAILED", "EXPIRED"],
  SUCCESS: [], FAILED: [], CANCELLED: [], EXPIRED: [], UNSUPPORTED: [], NOT_CONFIGURED: [],
};

export function assertOnboardingTransition(from: OnboardingStatus, to: OnboardingStatus) {
  if (!onboardingTransitions[from].includes(to)) throw new HttpError(409, `Invalid onboarding transition: ${from} to ${to}`);
}

export async function transitionOnboarding(id: string, from: OnboardingStatus, to: OnboardingStatus) {
  assertOnboardingTransition(from, to);
  const updated = await prisma.deviceOnboardingSession.updateMany({ where: { id, status: from }, data: { status: to } });
  if (updated.count !== 1) throw new HttpError(409, "Onboarding session changed; retry is not permitted");
}

export async function prepareOnboardingForRegistration(id: string, current: OnboardingStatus) {
  const path: Partial<Record<OnboardingStatus, OnboardingStatus[]>> = {
    IDLE: ["SCANNING", "DEVICE_FOUND", "DEVICE_SELECTED", "PROVISIONING"],
    PERMISSION_REQUIRED: ["SCANNING", "DEVICE_FOUND", "DEVICE_SELECTED", "PROVISIONING"],
    SCANNING: ["DEVICE_FOUND", "DEVICE_SELECTED", "PROVISIONING"],
    DEVICE_FOUND: ["DEVICE_SELECTED", "PROVISIONING"],
    DEVICE_SELECTED: ["PROVISIONING"],
    PROVISIONING: [],
    WAITING_FOR_NETWORK: [],
  };
  const steps = path[current];
  if (!steps) throw new HttpError(409, "Session cannot be completed from its current state");
  let from = current;
  for (const to of steps) { await transitionOnboarding(id, from, to); from = to; }
  return from;
}

export async function createOnboarding(actor: Actor, homeId: string, input: { roomId?: string | null; onboardingType: OnboardingType }) {
  await homeAccess(actor, homeId, true);
  if (input.roomId && !await prisma.room.findFirst({ where: { id: input.roomId, homeId }, select: { id: true } })) throw new HttpError(400, "Room must belong to Home");
  return prisma.deviceOnboardingSession.create({ data: { homeId, roomId: input.roomId, initiatedByUserId: actor.id, onboardingType: input.onboardingType, protocol: protocol[input.onboardingType], status: input.onboardingType === "WIFI_BLE" ? "PERMISSION_REQUIRED" : "IDLE", expiresAt: new Date(Date.now() + 15 * 60_000) }, select: sessionSelect });
}

export async function onboardingAccess(actor: Actor, id: string, manage = false) {
  const session = await prisma.deviceOnboardingSession.findUnique({ where: { id }, select: { ...sessionSelect, initiatedByUserId: true } });
  if (!session) throw new HttpError(404, "Onboarding session not found");
  await homeAccess(actor, session.homeId, manage);
  return session;
}

export type AdoptionInput = { roomId?: string | null; name?: string; deviceType?: DeviceType; capabilities?: string[]; state?: Record<string, unknown> };

export async function completeAdoption(actor: Actor, sessionId: string, result: ProviderResult<AdoptedDevice>, provider: ProvisioningProvider, input: AdoptionInput = {}) {
  const session = await onboardingAccess(actor, sessionId, true);
  if (session.expiresAt <= new Date()) {
    if (onboardingTransitions[session.status].includes("EXPIRED")) await transitionOnboarding(session.id, session.status, "EXPIRED");
    throw new HttpError(409, "Session expired");
  }
  if (result.status === "NOT_CONFIGURED") {
    assertOnboardingTransition(session.status, "NOT_CONFIGURED");
    await transitionOnboarding(session.id, session.status, "NOT_CONFIGURED");
    return { session: await prisma.deviceOnboardingSession.findUniqueOrThrow({ where: { id: session.id }, select: sessionSelect }), result };
  }
  if (input.roomId && !await prisma.room.findFirst({ where: { id: input.roomId, homeId: session.homeId }, select: { id: true } })) throw new HttpError(400, "Room must belong to onboarding Home");
  const adopted = result.value;
  if (adopted.protocol !== session.protocol) throw new HttpError(400, "Provider protocol does not match onboarding session");
  if (!adopted.externalId.trim() || !adopted.capabilities.length) throw new HttpError(400, "Provider returned an invalid device");
  assertOnboardingTransition(session.status, "REGISTERING");
  try {
    return await prisma.$transaction(async (tx) => {
      const transitioned = await tx.deviceOnboardingSession.updateMany({ where: { id: session.id, status: session.status, expiresAt: { gt: new Date() } }, data: { status: "REGISTERING", roomId: input.roomId ?? session.roomId, provider, discoveredIdentifier: adopted.externalId } });
      if (transitioned.count !== 1) throw new HttpError(409, "Session cannot be completed");
      const duplicate = await tx.deviceIntegrationIdentity.findUnique({ where: { provider_externalId: { provider, externalId: adopted.externalId } }, select: { id: true } });
      if (duplicate) throw new HttpError(409, "Device is already registered");
      const device = await tx.device.create({ data: { homeId: session.homeId, roomId: input.roomId ?? session.roomId, name: (input.name ?? adopted.name).trim(), deviceType: input.deviceType ?? adopted.deviceType, protocol: adopted.protocol, manufacturer: adopted.manufacturer, model: adopted.model, externalDeviceId: adopted.externalId, capabilities: (input.capabilities ?? adopted.capabilities) as Prisma.InputJsonValue, state: (input.state ?? adopted.state) as Prisma.InputJsonValue, integrationIdentities: { create: { provider, externalId: adopted.externalId } } } });
      await tx.deviceOnboardingSession.update({ where: { id: session.id }, data: { status: "SUCCESS" } });
      return { session: await tx.deviceOnboardingSession.findUniqueOrThrow({ where: { id: session.id }, select: sessionSelect }), device, result };
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") throw new HttpError(409, "Device is already registered");
    throw error;
  }
}
