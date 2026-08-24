import { prisma } from "@/lib/db";
import { listDevices } from "@/lib/devices";
import { errorResponse, HttpError } from "@/lib/errors";
import { requireUser } from "@/lib/session";
export async function GET(_request: Request, context: { params: Promise<{ homeId: string; roomId: string }> }) { try { const actor = await requireUser(); const { homeId, roomId } = await context.params; if (!await prisma.room.findFirst({ where: { id: roomId, homeId }, select: { id: true } })) throw new HttpError(404, "Room not found"); return Response.json({ devices: await listDevices(actor, homeId, roomId) }); } catch (error) { return errorResponse(error); } }
