import { prisma } from "@/lib/db";
import { errorResponse, HttpError } from "@/lib/errors";
import { homeAccess, homeSelect } from "@/lib/homes";
import { requireUser } from "@/lib/session";
import { updateHomeSchema } from "@/lib/validation";
export async function GET(_request: Request, context: { params: Promise<{ homeId: string }> }) { try { const actor = await requireUser(); const { homeId: id } = await context.params; await homeAccess(actor, id); const home = await prisma.home.findUnique({ where: { id }, select: { ...homeSelect, rooms: { select: { id: true, name: true } } } }); if (!home) throw new HttpError(404, "Home not found"); return Response.json({ home }); } catch (error) { return errorResponse(error); } }
export async function PATCH(request: Request, context: { params: Promise<{ homeId: string }> }) { try { const actor = await requireUser(); const { homeId: id } = await context.params; await homeAccess(actor, id, true); const input = updateHomeSchema.parse(await request.json()); return Response.json({ home: await prisma.home.update({ where: { id }, data: { ...input, name: input.name?.trim() }, select: homeSelect }) }); } catch (error) { return errorResponse(error); } }
