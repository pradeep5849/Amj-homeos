import { clearSession } from "@/lib/session";
import { errorResponse } from "@/lib/errors";
export async function POST() { try { await clearSession(); return new Response(null, { status: 204 }); } catch (error) { return errorResponse(error); } }
