import { z } from "zod";
import { prisma } from "@/lib/db";
import { HttpError, errorResponse } from "@/lib/errors";
import { homeAccess } from "@/lib/homes";
import { requireUser } from "@/lib/session";

type Context = { params: Promise<{ homeId: string; cameraId: string }> };
const schema = z.object({ gatewayId: z.uuid().nullable() }).strict();

/** An administrator must explicitly assign each camera to its local gateway. */
export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requireUser();
    const { homeId, cameraId } = await context.params;
    const home = await homeAccess(actor, homeId, true);
    if (home.isArchived) throw new HttpError(409, "Home is archived");
    const { gatewayId } = schema.parse(await request.json());
    if (gatewayId) {
      const gateway = await prisma.gateway.findFirst({
        where: { id: gatewayId, homeId, gatewayType: "CCTV", cctvStatus: "ACTIVE", isArchived: false },
        select: { id: true },
      });
      if (!gateway) throw new HttpError(404, "Active CCTV gateway not found");
    }
    const updated = await prisma.camera.updateMany({
      where: { id: cameraId, homeId, isArchived: false },
      data: { cctvGatewayId: gatewayId, connectionStatus: "UNKNOWN" },
    });
    if (updated.count !== 1) throw new HttpError(404, "Camera not found");
    return Response.json({ assigned: true, gatewayId }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
