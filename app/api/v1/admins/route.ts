import { createAdmin } from "@/lib/accounts";
import { prisma } from "@/lib/db";
import { errorResponse } from "@/lib/errors";
import { publicUserSelect } from "@/lib/public-user";
import { requireSuperAdmin } from "@/lib/session";
import { createAdminSchema } from "@/lib/validation";

export async function POST(request: Request) { try { await requireSuperAdmin(); const input = createAdminSchema.parse(await request.json()); return Response.json({ admin: await createAdmin(input) }, { status: 201 }); } catch (error) { return errorResponse(error); } }
export async function GET() { try { await requireSuperAdmin(); const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { ...publicUserSelect, adminProfile: { select: { isDefaultAdmin: true, _count: { select: { assignedHomeOwners: true } } } } }, orderBy: { createdAt: "asc" } }); return Response.json({ admins }); } catch (error) { return errorResponse(error); } }
