import { z } from "zod";
import { prisma } from "@/lib/db";
import { errorResponse, HttpError } from "@/lib/errors";
import { gatewayChallengeDigest, newGatewayChallenge } from "@/lib/cctv/gateway-challenge";

const paramsSchema = z.object({ homeId: z.uuid(), gatewayId: z.uuid() });
const CHALLENGE_TTL_MS = 60_000;
const MAX_ACTIVE_CHALLENGES = 3;

/**
 * Public challenge request: no secret is disclosed. A challenge is only
 * issued for an ACTIVE gateway already registered to the specified home.
 * Rate limiting at the reverse proxy is additionally required.
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ homeId: string; gatewayId: string }> },
) {
  try {
    const { homeId, gatewayId } = paramsSchema.parse(await context.params);
    const now = new Date();
    const challenge = newGatewayChallenge();
    const expiresAt = new Date(now.getTime() + CHALLENGE_TTL_MS);
    const issued = await prisma.$transaction(async tx => {
      // Serialize requests per gateway to prevent concurrent quota bypass.
      await tx.$queryRaw`SELECT "id" FROM "CctvGateway" WHERE "id" = ${gatewayId}::uuid AND "homeId" = ${homeId}::uuid AND "state" = 'ACTIVE' FOR UPDATE`;
      const gateway = await tx.cctvGateway.findFirst({
        where: { id: gatewayId, homeId, state: "ACTIVE" },
        select: { id: true },
      });
      if (!gateway) return false;
      const active = await tx.cctvGatewayChallenge.count({
        where: { gatewayId, homeId, consumedAt: null, expiresAt: { gt: now } },
      });
      if (active >= MAX_ACTIVE_CHALLENGES) throw new HttpError(429, "Too many outstanding challenges");
      await tx.cctvGatewayChallenge.create({
        data: { gatewayId, homeId, digest: gatewayChallengeDigest(challenge), expiresAt },
      });
      return true;
    });
    if (!issued) throw new HttpError(404, "Gateway not available");
    return Response.json({ gatewayId, homeId, challenge, expiresAt: expiresAt.toISOString() }, {
      status: 201, headers: { "Cache-Control": "no-store" },
    });
  } catch (error) { return errorResponse(error); }
}
