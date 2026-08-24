import { registerHomeOwner } from "@/lib/accounts";
import { errorResponse } from "@/lib/errors";
import { createSession } from "@/lib/session";
import { registerSchema } from "@/lib/validation";

export async function POST(request: Request) { try { const input = registerSchema.parse(await request.json()); const user = await registerHomeOwner(input); await createSession(user.id); return Response.json({ user }, { status: 201 }); } catch (error) { return errorResponse(error); } }
