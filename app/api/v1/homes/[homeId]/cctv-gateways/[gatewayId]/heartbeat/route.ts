import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import { HttpError, errorResponse } from "@/lib/errors";
import { verifyGatewayRequest } from "@/lib/cctv/gateway-request-auth";

type Context = { params: Promise<{ homeId: string; gatewayId: string }> };

/** Gateway-only signed heartbeat. Not authenticated using a browser session. */
export async function POST(request: Request, context: Context) {
  try {
    const { homeId, gatewayId } = await context.params;
    const timestamp = Number(request.headers.get("x-cctv-timestamp"));
    const nonce = request.headers.get("x-cctv-nonce") ?? "";
    const signature = request.headers.get("x-cctv-signature") ?? "";
    const gateway = await prisma.gateway.findFirst({
      where: {
        id: gatewayId, homeId, gatewayType: "CCTV", cctvStatus: "ACTIVE",
        isArchived: false, home: { isArchived: false },
      },
      select: { cctvPublicKey: true },
    });
    if (!gateway?.cctvPublicKey) throw new HttpError(401, "Gateway not authorized");
    const body = await request.text();
    if (body.length !== 0) throw new HttpError(400, "Heartbeat must have an empty body");
    const path = new URL(request.url).pathname;
    const valid = verifyGatewayRequest({
      homeId, gatewayId, method: "POST", path, timestamp, nonce, signature,
      bodyHash: createHash("sha256").update(body).digest("hex"),
      publicKey: gateway.cctvPublicKey,
    });
    if (!valid) throw new HttpError(401, "Invalid gateway signature");
    try {
      await prisma.cctvGatewayRequestNonce.create({ data: { gatewayId, homeId, nonce } });
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
        throw new HttpError(409, "Gateway request replayed");
      }
      throw error;
    }
    const result = await prisma.gateway.updateMany({
      where: { id: gatewayId, homeId, gatewayType: "CCTV", cctvStatus: "ACTIVE", isArchived: false },
      data: { isOnline: true, lastSeenAt: new Date() },
    });
    if (!result.count) throw new HttpError(401, "Gateway no longer authorized");
    return Response.json({ accepted: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
