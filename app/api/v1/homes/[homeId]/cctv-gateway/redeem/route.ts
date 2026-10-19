import { z } from "zod";
import { prisma } from "@/lib/db";
import { errorResponse, HttpError } from "@/lib/errors";
import { hashGatewayEnrollmentCode } from "@/lib/cctv/gateway-enrollment-crypto";
import { verifyGatewayPairingProof } from "@/lib/cctv/gateway-pairing-proof";

const paramsSchema = z.object({ homeId: z.uuid() });
const bodySchema = z.object({
  code: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  displayName: z.string().trim().min(1).max(120),
  publicKeyPem: z.string().min(80).max(4096),
  signature: z.string().regex(/^[A-Za-z0-9_-]{86}$/),
}).strict();

/** One-use gateway pairing: code plus proof of possession of Ed25519 private key. */
export async function POST(request: Request, context: { params: Promise<{ homeId: string }> }) {
  try {
    const { homeId } = paramsSchema.parse(await context.params);
    const input = bodySchema.parse(await request.json());
    const pepper = process.env.CCTV_GATEWAY_ENROLLMENT_PEPPER;
    if (!pepper || pepper.length < 32) throw new HttpError(503, "CCTV gateway enrollment is not configured");
    if (!verifyGatewayPairingProof({ homeId, code: input.code, publicKeyPem: input.publicKeyPem, signature: input.signature })) {
      throw new HttpError(401, "Invalid or expired gateway pairing credentials");
    }
    const codeHash = hashGatewayEnrollmentCode(input.code, pepper);
    const now = new Date();
    const gateway = await prisma.$transaction(async tx => {
      // Conditional UPDATE ensures concurrent redemption attempts cannot reuse the code.
      const claimed = await tx.cctvGatewayEnrollmentCode.updateMany({
        where: { homeId, codeHash, consumedAt: null, revokedAt: null, expiresAt: { gt: now } },
        data: { consumedAt: now },
      });
      if (claimed.count !== 1) return null;
      const home = await tx.home.findFirst({ where: { id: homeId, isArchived: false }, select: { id: true } });
      if (!home) return null;
      return tx.cctvGateway.create({
        data: { homeId, displayName: input.displayName, publicKey: input.publicKeyPem, state: "ACTIVE" },
        select: { id: true, homeId: true, displayName: true, state: true, createdAt: true },
      });
    });
    if (!gateway) throw new HttpError(401, "Invalid or expired gateway pairing credentials");
    return Response.json({ gateway }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
