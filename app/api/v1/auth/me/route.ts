import { errorResponse } from "@/lib/errors";
import { requireUser } from "@/lib/session";
export async function GET() { try { const user = await requireUser(); return Response.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role, isActive: user.isActive, assignedAdmin: user.homeOwnerProfile?.assignedAdmin.user ?? null } }); } catch (error) { return errorResponse(error); } }
