import { z } from "zod";
import { prisma } from "@/lib/db";
import { HttpError, errorResponse } from "@/lib/errors";
import { homeAccess } from "@/lib/homes";
import { requireUser } from "@/lib/session";

type Context = { params: Promise<{ homeId: string }> };
const recorderInput = z.object({
  name: z.string().trim().min(1).max(120),
  brand: z.enum(["HIKVISION","CP_PLUS","DAHUA","TAPO","EZVIZ","REOLINK","GENERIC_ONVIF","OTHER"]),
  model: z.string().trim().max(120).nullable().optional(),
}).strict();

const publicRecorder = (r: {
  id: string; homeId: string; name: string; brand: string; model: string | null;
  isArchived: boolean;
}) => ({ id: r.id, homeId: r.homeId, name: r.name, brand: r.brand, model: r.model, isArchived: r.isArchived });

export async function GET(_request: Request, context: Context) {
  try {
    const actor = await requireUser();
    const { homeId } = await context.params;
    await homeAccess(actor, homeId);
    const recorders = await prisma.cameraRecorder.findMany({
      where: { homeId, isArchived: false }, orderBy: { createdAt: "asc" },
    });
    return Response.json({ recorders: recorders.map(publicRecorder) });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request, context: Context) {
  try {
    const actor = await requireUser();
    const { homeId } = await context.params;
    await homeAccess(actor, homeId, true);
    const input = recorderInput.parse(await request.json());
    const home = await prisma.home.findUnique({ where: { id: homeId }, select: { isArchived: true } });
    if (!home || home.isArchived) throw new HttpError(409, "Home is archived");
    const recorder = await prisma.cameraRecorder.create({
      data: { homeId, name: input.name, brand: input.brand, model: input.model ?? null },
    });
    return Response.json({ recorder: publicRecorder(recorder) }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
