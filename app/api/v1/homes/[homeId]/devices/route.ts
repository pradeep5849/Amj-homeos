import { listDevices } from "@/lib/devices";
import { errorResponse } from "@/lib/errors";
import { requireUser } from "@/lib/session";
export async function GET(_request: Request, context: { params: Promise<{ homeId: string }> }) { try { const { homeId } = await context.params; return Response.json({ devices: await listDevices(await requireUser(), homeId) }); } catch (error) { return errorResponse(error); } }
