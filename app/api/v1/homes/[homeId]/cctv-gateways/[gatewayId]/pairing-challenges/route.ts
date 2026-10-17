import { prisma } from "@/lib/db";
import { HttpError, errorResponse } from "@/lib/errors";
import { homeAccess } from "@/lib/homes";
import { requireUser } from "@/lib/session";
import { createPairingToken, digestPairingToken, CCTV_PAIRING_TTL_MS } from "@/lib/cctv/pairing-token";

type Context = { params: Promise<{ homeId: string; gatewayId: string }> };

export async function POST(_request: Request, context: Context) {
  try {
    const actor = await requireUser();
    const { homeId, gatewayId } = await context.params;
    const home = await homeAccess(actor, homeId, true);
    if (home.isArchived) throw new HttpError(409, "Home is archived");

    const configuredKey = process.env.CCTV_PAIRING_HMAC_KEY;
    if (!configuredKey || !/^[0-9a-fA-F]{64,}$/.test(configuredKey) || configuredKey.length % 2) {
      throw new HttpError(503, "Pairing is not configured");
    }
    const key = Buffer.from(configuredKey, "hex");
    const gateway = await prisma.gateway.findFirst({
      where: { id: gatewayId, homeId, gatewayType: "CCTV", cctvStatus: "PENDING", isArchived: false },
      select: { id: true },
    });
    if (!gateway) throw new HttpError(404, "Pending gateway not found");

    const now = new Date();
    const active = await prisma.cctvGatewayPairingChallenge.count({
      where: { gatewayId, homeId, consumedAt: null, expiresAt: { gt: now } },
    });
    if (active) throw new HttpError(409, "Pairing challenge already issued");

    const token = createPairingToken();
    const expiresAt = new Date(now.getTime() + CCTV_PAIRING_TTL_MS);
    await prisma.cctvGatewayPairingChallenge.create({
      data: { gatewayId, homeId, tokenDigest: digestPairingToken(token, key), expiresAt },
    });
    return Response.json({ token, expiresAt }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
