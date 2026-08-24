import { updateAdmin } from "@/lib/accounts";
import { errorResponse } from "@/lib/errors";
import { requireSuperAdmin } from "@/lib/session";
import { updateAdminSchema } from "@/lib/validation";
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) { try { await requireSuperAdmin(); const { id } = await context.params; const input = updateAdminSchema.parse(await request.json()); return Response.json({ admin: await updateAdmin(id, input) }); } catch (error) { return errorResponse(error); } }
