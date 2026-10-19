import { z } from "zod";
import { prisma } from "@/lib/db";
import { errorResponse, HttpError } from "@/lib/errors";
import { signedGatewayHeartbeatSchema, verifySignedGatewayHeartbeat } from "@/lib/cctv/gateway-signed-heartbeat";

const paramsSchema = z.object({ homeId: z.uuid(), gatewayId: z.uuid() });
/**
 * Accepts signed gateway liveness without granting video or PTZ permissions.
 * The nonce is persisted via the challenge digest uniqueness index to reject replay.
 */
export async function POST(request: Request, context: { params: Promise<{ homeId: string; gatewayId: string }> }) {
  try {
    const { homeId, gatewayId } = paramsSchema.parse(await context.params);
    const input = signedGatewayHeartbeatSchema.parse(await request.json());
    if (input.homeId !== homeId || input.gatewayId !== gatewayId) throw new HttpError(401, "Invalid gateway heartbeat");
    const now = new Date();
    const result = await prisma.$transaction(async tx => {
      const gateway = await tx.cctvGateway.findFirst({
        where: { id: gatewayId, homeId, state: "ACTIVE" },
        select: { publicKey: true },
      });
      if (!gateway || !verifySignedGatewayHeartbeat(input, gateway.publicKey, now)) return false;
      // Unique digest persists nonce across restarts. Never reuse a nonce.
      const { createHash } = await import("node:crypto");
      const digest = createHash("sha256")
        .update("amj:cctv:heartbeat-nonce:v1\0").update(gatewayId).update("\0").update(input.nonce).digest("hex");
      const existing = await tx.cctvGatewayChallenge.findUnique({ where: { digest }, select: { id: true } });
      if (existing) return false;
      await tx.cctvGatewayChallenge.create({
        data: { homeId, gatewayId, digest, expiresAt: new Date(now.getTime() + 60_000), consumedAt: now },
      });
      const updated = await tx.cctvGateway.updateMany({
        where: { id: gatewayId, homeId, state: "ACTIVE" },
        data: { lastSeenAt: now },
      });
      return updated.count === 1;
    });
    if (!result) throw new HttpError(401, "Invalid or replayed gateway heartbeat");
    return Response.json({ accepted: true, receivedAt: now.toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    // Concurrent duplicate nonces may raise a unique-key conflict; fail closed.
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return Response.json({ error: "Invalid or replayed gateway heartbeat" }, { status: 401 });
    }
    return errorResponse(error);
  }
}
