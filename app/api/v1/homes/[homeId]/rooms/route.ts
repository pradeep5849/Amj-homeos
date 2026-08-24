import { prisma } from "@/lib/db";
import { errorResponse } from "@/lib/errors";
import { createRoom, homeAccess, roomSelect } from "@/lib/homes";
import { requireUser } from "@/lib/session";
import { createRoomSchema } from "@/lib/validation";
export async function POST(request: Request, context: { params: Promise<{ homeId: string }> }) { try { const actor = await requireUser(); const { homeId } = await context.params; const input = createRoomSchema.parse(await request.json()); return Response.json({ room: await createRoom(actor, homeId, input.name) }, { status: 201 }); } catch (error) { return errorResponse(error); } }
export async function GET(_request: Request, context: { params: Promise<{ homeId: string }> }) { try { const actor = await requireUser(); const { homeId } = await context.params; await homeAccess(actor, homeId); return Response.json({ rooms: await prisma.room.findMany({ where: { homeId }, select: roomSelect, orderBy: { createdAt: "asc" } }) }); } catch (error) { return errorResponse(error); } }
