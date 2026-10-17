import { z } from "zod";
import { prisma } from "@/lib/db";
import { HttpError, errorResponse } from "@/lib/errors";
import { homeAccess } from "@/lib/homes";
import { requireUser } from "@/lib/session";

type Context = { params: Promise<{ homeId: string; cameraId: string }> };
const schema = z.object({ purpose: z.enum(["LIVE", "RECORDINGS", "PTZ"]) }).strict();

/**
 * An authorization record only, NOT a video stream or a signed playback URL.
 * Relay integration must independently validate this record before use.
 */
export async function POST(request: Request, context: Context) {
  try {
    const actor = await requireUser();
    const { homeId, cameraId } = await context.params;
    const home = await homeAccess(actor, homeId);
    if (home.isArchived) throw new HttpError(409, "Home is archived");
    const { purpose } = schema.parse(await request.json());
    const camera = await prisma.camera.findFirst({
      where: { id: cameraId, homeId, isArchived: false },
    });
    if (!camera) throw new HttpError(404, "Camera not found");
    const caps = camera.capabilities;
    if (!caps || typeof caps !== "object" || Array.isArray(caps)) throw new HttpError(409, "Camera capabilities unavailable");
    const flags = caps as Record<string, unknown>;
    const capability = purpose === "LIVE" ? "live" : purpose === "PTZ" ? "ptz" : "recordings";
    if (flags[capability] !== true || camera.connectionStatus !== "ONLINE") {
      throw new HttpError(409, "Camera capability is not available");
    }
    const expiresAt = new Date(Date.now() + 60 * 1000);
    const session = await prisma.cctvAccessSession.create({
      data: { homeId, cameraId, userId: actor.id, purpose, expiresAt },
      select: { id: true, expiresAt: true, purpose: true },
    });
    return Response.json({ authorization: session, streamAvailable: false }, {
      status: 201, headers: { "Cache-Control": "no-store" },
    });
  } catch (error) { return errorResponse(error); }
}
