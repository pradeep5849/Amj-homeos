import { prisma } from "@/lib/db";
import { HttpError, errorResponse } from "@/lib/errors";
import { homeAccess } from "@/lib/homes";
import { requireUser } from "@/lib/session";
import { cameraRegistrationSchema, toPublicCamera } from "@/lib/cctv/registration";

type Context = { params: Promise<{ homeId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const actor = await requireUser();
    const { homeId } = await context.params;
    await homeAccess(actor, homeId);
    const cameras = await prisma.camera.findMany({
      where: { homeId, isArchived: false },
      orderBy: { createdAt: "asc" },
    });
    return Response.json({ cameras: cameras.map(toPublicCamera) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const actor = await requireUser();
    const { homeId } = await context.params;
    await homeAccess(actor, homeId, true);
    const input = cameraRegistrationSchema.parse(await request.json());
    if (input.homeId !== homeId) throw new HttpError(400, "Home mismatch");
    const home = await prisma.home.findUnique({ where: { id: homeId }, select: { isArchived: true } });
    if (!home || home.isArchived) throw new HttpError(409, "Home is archived");
    if (input.roomId) {
      const room = await prisma.room.findFirst({ where: { id: input.roomId, homeId }, select: { id: true } });
      if (!room) throw new HttpError(400, "Room does not belong to home");
    }
    if (input.recorderId) {
      const recorder = await prisma.cameraRecorder.findFirst({
        where: { id: input.recorderId, homeId, isArchived: false }, select: { id: true },
      });
      if (!recorder) throw new HttpError(400, "Recorder does not belong to home");
    }
    const camera = await prisma.camera.create({
      data: {
        homeId,
        roomId: input.roomId ?? null,
        recorderId: input.recorderId ?? null,
        recorderChannel: input.recorderChannel ?? null,
        name: input.name,
        brand: input.brand,
        model: input.model ?? null,
        sourceKind: input.sourceKind,
        connectionMethod: input.connectionMethod,
        capabilities: input.capabilities,
      },
    });
    return Response.json({ camera: toPublicCamera(camera) }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
