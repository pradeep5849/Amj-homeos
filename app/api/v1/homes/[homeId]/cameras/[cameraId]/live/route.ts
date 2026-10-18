import { prisma } from "@/lib/db";
import { errorResponse, HttpError } from "@/lib/errors";
import { homeAccess } from "@/lib/homes";
import { requireUser } from "@/lib/session";

/**
 * CCTV-03 readiness endpoint. This is NOT a stream URL or media proxy.
 * Explicitly refuse playback until a trusted local gateway is enrolled.
 * Never expose internal secretRef or network connection parameters.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ homeId: string; cameraId: string }> },
) {
  try {
    const actor = await requireUser();
    const { homeId, cameraId } = await context.params;
    await homeAccess(actor, homeId);
    const camera = await prisma.camera.findFirst({
      where: { id: cameraId, homeId, isArchived: false },
      select: { id: true, connectionMethod: true, connectionStatus: true, capabilities: true },
    });
    if (!camera) throw new HttpError(404, "Camera not found");
    return Response.json({
      cameraId: camera.id,
      available: false,
      reason: "GATEWAY_NOT_CONFIGURED",
      message: "Live view requires a trusted local gateway. Streaming is not configured.",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
