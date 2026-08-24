import { prisma } from "@/lib/db";
import { deviceAccess, deviceSelect, verifyRoom } from "@/lib/devices";
import { errorResponse } from "@/lib/errors";
import { requireUser } from "@/lib/session";
import { updateDeviceSchema } from "@/lib/validation";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) { try { const actor = await requireUser(); const { id } = await context.params; await deviceAccess(actor, id); return Response.json({ device: await prisma.device.findUnique({ where: { id }, select: deviceSelect }) }); } catch (error) { return errorResponse(error); } }
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) { try { const actor = await requireUser(); const { id } = await context.params; const device = await deviceAccess(actor, id, true); const input = updateDeviceSchema.parse(await request.json()); await verifyRoom(device.homeId, input.roomId); return Response.json({ device: await prisma.device.update({ where: { id }, data: input, select: deviceSelect }) }); } catch (error) { return errorResponse(error); } }
