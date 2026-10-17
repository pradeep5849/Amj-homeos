import { z } from "zod";
import { prisma } from "@/lib/db";
import { HttpError, errorResponse } from "@/lib/errors";
import { homeAccess } from "@/lib/homes";
import { requireUser } from "@/lib/session";
import { publicCctvGateway } from "../route";

type Context = { params: Promise<{ homeId: string; gatewayId: string }> };
const inputSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  status: z.enum(["SUSPENDED", "REVOKED"]).optional(),
}).strict().refine(value => Object.keys(value).length > 0);

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requireUser();
    const { homeId, gatewayId } = await context.params;
    const home = await homeAccess(actor, homeId, true);
    if (home.isArchived) throw new HttpError(409, "Home is archived");
    const input = inputSchema.parse(await request.json());
    const existing = await prisma.gateway.findFirst({
      where: { id: gatewayId, homeId, gatewayType: "CCTV", isArchived: false },
    });
    if (!existing) throw new HttpError(404, "Gateway not found");
    if (existing.cctvStatus === "REVOKED") throw new HttpError(409, "Gateway is revoked");
    const result = await prisma.gateway.updateMany({
      where: { id: gatewayId, homeId, gatewayType: "CCTV", isArchived: false, cctvStatus: { not: "REVOKED" } },
      data: { name: input.name, cctvStatus: input.status, isOnline: input.status ? false : undefined },
    });
    if (result.count !== 1) throw new HttpError(409, "Gateway state changed");
    const updated = await prisma.gateway.findFirstOrThrow({ where: { id: gatewayId, homeId, gatewayType: "CCTV" } });
    return Response.json({ gateway: publicCctvGateway(updated) });
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const actor = await requireUser();
    const { homeId, gatewayId } = await context.params;
    const home = await homeAccess(actor, homeId, true);
    if (home.isArchived) throw new HttpError(409, "Home is archived");
    const result = await prisma.gateway.updateMany({
      where: { id: gatewayId, homeId, gatewayType: "CCTV", isArchived: false },
      data: { cctvStatus: "REVOKED", isArchived: true, isOnline: false },
    });
    if (result.count === 0) throw new HttpError(404, "Gateway not found");
    return Response.json({ revoked: true });
  } catch (error) { return errorResponse(error); }
}
