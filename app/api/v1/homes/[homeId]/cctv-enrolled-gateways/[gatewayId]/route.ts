import { z } from "zod";
import { prisma } from "@/lib/db";
import { errorResponse, HttpError } from "@/lib/errors";
import { homeAccess } from "@/lib/homes";
import { requireUser } from "@/lib/session";

type Context = { params: Promise<{ homeId: string; gatewayId: string }> };
const updateSchema = z.object({
  state: z.enum(["SUSPENDED", "REVOKED"]),
}).strict();

/** Only home owners/admins may suspend or permanently revoke enrolled agents. */
export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requireUser();
    const { homeId, gatewayId } = await context.params;
    const home = await homeAccess(actor, homeId, true);
    if (home.isArchived) throw new HttpError(409, "Home is archived");
    const { state } = updateSchema.parse(await request.json());
    const result = await prisma.cctvGateway.updateMany({
      where: { id: gatewayId, homeId, state: { in: ["ACTIVE", "PENDING", "SUSPENDED"] } },
      data: { state },
    });
    if (!result.count) throw new HttpError(404, "Active gateway not found");
    return Response.json({ gatewayId, state }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
