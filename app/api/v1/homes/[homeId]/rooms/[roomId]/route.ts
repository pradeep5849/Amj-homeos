import { prisma } from "@/lib/db";
import { errorResponse, HttpError } from "@/lib/errors";
import { homeAccess, roomSelect } from "@/lib/homes";
import { requireUser } from "@/lib/session";
import { normalizeRoomName, updateRoomSchema } from "@/lib/validation";
import { deleteRoom } from "@/lib/deletion";
async function roomInHome(homeId: string, roomId: string) { if (!await prisma.room.findFirst({ where: { id: roomId, homeId }, select: { id: true } })) throw new HttpError(404, "Room not found"); }
export async function PATCH(request: Request, context: { params: Promise<{ homeId: string; roomId: string }> }) { try { const actor = await requireUser(); const { homeId, roomId } = await context.params; await homeAccess(actor, homeId, true); await roomInHome(homeId, roomId); const input = updateRoomSchema.parse(await request.json()); const name = input.name.trim().replace(/\s+/g, " "); return Response.json({ room: await prisma.room.update({ where: { id: roomId }, data: { name, normalizedName: normalizeRoomName(name) }, select: roomSelect }) }); } catch (error) { return errorResponse(error); } }
export async function DELETE(_request: Request, context: { params: Promise<{ homeId: string; roomId: string }> }) { try { const actor = await requireUser(); const { homeId, roomId } = await context.params; await deleteRoom(actor, homeId, roomId); return new Response(null, { status: 204 }); } catch (error) { return errorResponse(error); } }
