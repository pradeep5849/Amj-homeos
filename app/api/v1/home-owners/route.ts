import { createHomeOwnerForAdmin } from "@/lib/accounts";
import { prisma } from "@/lib/db";
import { errorResponse, HttpError } from "@/lib/errors";
import { publicUserSelect } from "@/lib/public-user";
import { requireUser } from "@/lib/session";
import { createHomeOwnerSchema } from "@/lib/validation";

export async function POST(request: Request) { try { const actor = await requireUser(); if (actor.role !== "ADMIN") throw new HttpError(403, "Only an Admin can create a Home Owner"); const input = createHomeOwnerSchema.parse(await request.json()); return Response.json({ homeOwner: await createHomeOwnerForAdmin(input, actor.id) }, { status: 201 }); } catch (error) { return errorResponse(error); } }
export async function GET() { try { const actor = await requireUser(); const where = actor.role === "SUPER_ADMIN" ? { role: "HOME_OWNER" as const } : actor.role === "ADMIN" ? { role: "HOME_OWNER" as const, homeOwnerProfile: { assignedAdminId: actor.id } } : { id: actor.id, role: "HOME_OWNER" as const }; const homeOwners = await prisma.user.findMany({ where, select: { ...publicUserSelect, homeOwnerProfile: { select: { assignedAdmin: { select: { user: { select: { id: true, name: true } } } } } } }, orderBy: { createdAt: "asc" } }); return Response.json({ homeOwners }); } catch (error) { return errorResponse(error); } }
