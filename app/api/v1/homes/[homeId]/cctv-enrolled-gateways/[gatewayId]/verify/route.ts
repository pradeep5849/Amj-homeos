import { z } from "zod";
import { prisma } from "@/lib/db";
import { errorResponse, HttpError } from "@/lib/errors";
import { gatewayChallengeDigest } from "@/lib/cctv/gateway-challenge";
import { verifyGatewayProof } from "@/lib/cctv/gateway-proof";

const paramsSchema = z.object({ homeId: z.uuid(), gatewayId: z.uuid() });
const bodySchema = z.object({
  challenge: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  signature: z.string().regex(/^[A-Za-z0-9_-]{86}$/),
}).strict();

/**
 * Proves a registered gateway holds its Ed25519 private key.
 * This endpoint does not create a session or authorize media operations.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ homeId: string; gatewayId: string }> },
) {
  try {
    const { homeId, gatewayId } = paramsSchema.parse(await context.params);
    const { challenge, signature } = bodySchema.parse(await request.json());
    const now = new Date();
    const digest = gatewayChallengeDigest(challenge);
    const verified = await prisma.$transaction(async tx => {
      const gateway = await tx.cctvGateway.findFirst({
        where: { id: gatewayId, homeId, state: "ACTIVE" },
        select: { publicKey: true },
      });
      if (!gateway) return false;
      // Consume even failed signature attempts: one challenge permits one attempt.
      const consumed = await tx.cctvGatewayChallenge.updateMany({
        where: { homeId, gatewayId, digest, consumedAt: null, expiresAt: { gt: now } },
        data: { consumedAt: now },
      });
      if (consumed.count !== 1) return false;
      return verifyGatewayProof({
        publicKeyPem: gateway.publicKey, gatewayId, homeId, challenge, signature,
      });
    });
    if (!verified) throw new HttpError(401, "Gateway proof invalid or expired");
    return Response.json({ verified: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
