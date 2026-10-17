import { z } from "zod";
import { prisma } from "@/lib/db";
import { HttpError, errorResponse } from "@/lib/errors";
import { homeAccess } from "@/lib/homes";
import { requireUser } from "@/lib/session";

type Context = { params: Promise<{ homeId: string }> };
const inputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  connectionType: z.enum(["WIFI", "ETHERNET"]),
}).strict();

export const publicCctvGateway = (gateway: {
  id: string; homeId: string; name: string; gatewayType: string;
  connectionType: string; cctvStatus: string | null; isArchived: boolean;
}) => ({
  id: gateway.id, homeId: gateway.homeId, name: gateway.name,
  gatewayType: gateway.gatewayType, connectionType: gateway.connectionType,
  status: gateway.cctvStatus, isArchived: gateway.isArchived,
});

export async function GET(_request: Request, context: Context) {
  try {
    const actor = await requireUser();
    const { homeId } = await context.params;
    await homeAccess(actor, homeId);
    const gateways = await prisma.gateway.findMany({
      where: { homeId, gatewayType: "CCTV", isArchived: false },
      orderBy: { createdAt: "asc" },
    });
    return Response.json({ gateways: gateways.map(publicCctvGateway) });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request, context: Context) {
  try {
    const actor = await requireUser();
    const { homeId } = await context.params;
    const home = await homeAccess(actor, homeId, true);
    if (home.isArchived) throw new HttpError(409, "Home is archived");
    const input = inputSchema.parse(await request.json());
    const gateway = await prisma.gateway.create({
      data: { homeId, name: input.name, connectionType: input.connectionType,
        gatewayType: "CCTV", cctvStatus: "PENDING" },
    });
    return Response.json({ gateway: publicCctvGateway(gateway) }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
