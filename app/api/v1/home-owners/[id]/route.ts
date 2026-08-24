import { prisma } from "@/lib/db";
import { errorResponse, HttpError } from "@/lib/errors";
import { publicUserSelect } from "@/lib/public-user";
import { verifyHomeOwnerAccess } from "@/lib/session";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) { try { const { id } = await context.params; await verifyHomeOwnerAccess(id); const homeOwner = await prisma.user.findFirst({ where: { id, role: "HOME_OWNER" }, select: { ...publicUserSelect, homeOwnerProfile: { select: { assignedAdmin: { select: { user: { select: { id: true, name: true } } } } } } } }); if (!homeOwner) throw new HttpError(404, "Home Owner not found"); return Response.json({ homeOwner }); } catch (error) { return errorResponse(error); } }
