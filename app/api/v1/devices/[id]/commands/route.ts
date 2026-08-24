import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { deviceAccess, deviceSelect } from "@/lib/devices";
import { errorResponse, HttpError } from "@/lib/errors";
import { requireUser } from "@/lib/session";
import { deviceCommandSchema } from "@/lib/validation";
const capabilityByCommand = { setPower: "power", setBrightness: "brightness", setSpeed: "speed" } as const;
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) { try { const actor = await requireUser(); const { id } = await context.params; const device = await deviceAccess(actor, id); if (device.isArchived) throw new HttpError(409, "Archived Devices cannot receive commands"); const input = deviceCommandSchema.parse(await request.json()); const capability = capabilityByCommand[input.command]; if (!(device.capabilities as string[]).includes(capability)) throw new HttpError(400, "Device does not support this command"); const state = { ...(device.state as Record<string, unknown>), [capability]: input.value } as Prisma.InputJsonValue; return Response.json({ device: await prisma.device.update({ where: { id }, data: { state }, select: deviceSelect }), execution: "LOGICAL_STATE_ONLY" }); } catch (error) { return errorResponse(error); } }
