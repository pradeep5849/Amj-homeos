import { z } from "zod";
import { prisma } from "@/lib/db";
import { HttpError, errorResponse } from "@/lib/errors";
import { homeAccess } from "@/lib/homes";
import { requireUser } from "@/lib/session";
import { toPublicCamera } from "@/lib/cctv/registration";

type Context = { params: Promise<{ homeId: string; cameraId: string }> };
const updateInput = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  model: z.string().trim().max(120).nullable().optional(),
  roomId: z.uuid().nullable().optional(),
}).strict().refine(value => Object.keys(value).length > 0, "At least one field is required");

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requireUser();
    const { homeId, cameraId } = await context.params;
    const home = await homeAccess(actor, homeId, true);
    if (home.isArchived) throw new HttpError(409, "Home is archived");
    const input = updateInput.parse(await request.json());
    const camera = await prisma.camera.findFirst({ where: { id: cameraId, homeId, isArchived: false } });
    if (!camera) throw new HttpError(404, "Camera not found");
    if (input.roomId) {
      const room = await prisma.room.findFirst({ where: { id: input.roomId, homeId }, select: { id: true } });
      if (!room) throw new HttpError(400, "Room does not belong to home");
    }
    const updated = await prisma.camera.update({
      where: { id: camera.id },
      data: { name: input.name, model: input.model, roomId: input.roomId },
    });
    return Response.json({ camera: toPublicCamera(updated) });
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const actor = await requireUser();
    const { homeId, cameraId } = await context.params;
    const home = await homeAccess(actor, homeId, true);
    if (home.isArchived) throw new HttpError(409, "Home is archived");
    const result = await prisma.camera.updateMany({
      where: { id: cameraId, homeId, isArchived: false },
      data: { isArchived: true },
    });
    if (!result.count) throw new HttpError(404, "Camera not found");
    return Response.json({ archived: true });
  } catch (error) { return errorResponse(error); }
}
