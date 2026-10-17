import { z } from "zod";
import { prisma } from "@/lib/db";
import { HttpError, errorResponse } from "@/lib/errors";
import { homeAccess } from "@/lib/homes";
import { requireUser } from "@/lib/session";

type Context = { params: Promise<{ homeId: string; recorderId: string }> };
const updateInput = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  model: z.string().trim().max(120).nullable().optional(),
}).strict().refine(value => Object.keys(value).length > 0, "At least one field is required");

const toPublicRecorder = (r: {
  id: string; homeId: string; name: string; brand: string; model: string | null; isArchived: boolean;
}) => ({ id: r.id, homeId: r.homeId, name: r.name, brand: r.brand, model: r.model, isArchived: r.isArchived });

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requireUser();
    const { homeId, recorderId } = await context.params;
    const home = await homeAccess(actor, homeId, true);
    if (home.isArchived) throw new HttpError(409, "Home is archived");
    const input = updateInput.parse(await request.json());
    const recorder = await prisma.cameraRecorder.findFirst({
      where: { id: recorderId, homeId, isArchived: false },
    });
    if (!recorder) throw new HttpError(404, "Recorder not found");
    const updated = await prisma.cameraRecorder.update({
      where: { id: recorder.id }, data: { name: input.name, model: input.model },
    });
    return Response.json({ recorder: toPublicRecorder(updated) });
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const actor = await requireUser();
    const { homeId, recorderId } = await context.params;
    const home = await homeAccess(actor, homeId, true);
    if (home.isArchived) throw new HttpError(409, "Home is archived");
    const recorder = await prisma.cameraRecorder.findFirst({
      where: { id: recorderId, homeId, isArchived: false }, select: { id: true },
    });
    if (!recorder) throw new HttpError(404, "Recorder not found");
    const activeCamera = await prisma.camera.findFirst({
      where: { recorderId, homeId, isArchived: false }, select: { id: true },
    });
    if (activeCamera) throw new HttpError(409, "Archive linked cameras before archiving recorder");
    const result = await prisma.cameraRecorder.updateMany({
      where: { id: recorderId, homeId, isArchived: false }, data: { isArchived: true },
    });
    if (!result.count) throw new HttpError(404, "Recorder not found");
    return Response.json({ archived: true });
  } catch (error) { return errorResponse(error); }
}
