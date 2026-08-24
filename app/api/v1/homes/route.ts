import { errorResponse } from "@/lib/errors";
import { createHome, listHomes } from "@/lib/homes";
import { requireUser } from "@/lib/session";
import { createHomeSchema } from "@/lib/validation";
export async function POST(request: Request) { try { const actor = await requireUser(); const input = createHomeSchema.parse(await request.json()); return Response.json({ home: await createHome(actor, input) }, { status: 201 }); } catch (error) { return errorResponse(error); } }
export async function GET() { try { const actor = await requireUser(); return Response.json({ homes: await listHomes(actor) }); } catch (error) { return errorResponse(error); } }
