import { prisma } from "@/lib/db";
import { errorResponse } from "@/lib/errors";
import { homeAccess } from "@/lib/homes";
import { requireUser } from "@/lib/session";

type Context = { params: Promise<{ homeId: string }> };

/** Enrolled CCTV agent identities, distinct from legacy gateway registry. */
export async function GET(_request: Request, context: Context) {
  try {
    const actor = await requireUser();
    const { homeId } = await context.params;
    await homeAccess(actor, homeId);
    const gateways = await prisma.cctvGateway.findMany({
      where: { homeId },
      select: { id: true, displayName: true, state: true, lastSeenAt: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return Response.json({ gateways }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
