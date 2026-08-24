import { authenticate } from "@/lib/accounts";
import { errorResponse } from "@/lib/errors";
import { createSession } from "@/lib/session";
import { credentialsSchema } from "@/lib/validation";

export async function POST(request: Request) { try { const input = credentialsSchema.parse(await request.json()); const user = await authenticate(input.email, input.password); await createSession(user.id); return Response.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role, isActive: user.isActive } }); } catch (error) { return errorResponse(error); } }
