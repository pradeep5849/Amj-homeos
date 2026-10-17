import { prisma } from "@/lib/db";
import { HttpError, errorResponse } from "@/lib/errors";
import { digestPairingToken } from "@/lib/cctv/pairing-token";
import { gatewayEnrollmentSchema, verifyEnrollmentSignature } from "@/lib/cctv/gateway-enrollment";

type Context = { params: Promise<{ homeId: string; gatewayId: string }> };

/**
 * Bootstrap-only endpoint: a one-time pairing challenge is the authorization
 * factor, backed by gateway key proof. No browser session is required here.
 */
export async function POST(request: Request, context: Context) {
  try {
    const { homeId, gatewayId } = await context.params;
    const input = gatewayEnrollmentSchema.parse(await request.json());
    const keyHex = process.env.CCTV_PAIRING_HMAC_KEY;
    if (!keyHex || !/^[0-9a-fA-F]{64,}$/.test(keyHex) || keyHex.length % 2) {
      throw new HttpError(503, "Pairing is not configured");
    }
    if (!verifyEnrollmentSignature(homeId, gatewayId, input.token, input.publicKey, input.signature)) {
      throw new HttpError(401, "Invalid pairing proof");
    }
    const tokenDigest = digestPairingToken(input.token, Buffer.from(keyHex, "hex"));
    const pairedAt = new Date();
    const paired = await prisma.$transaction(async tx => {
      // The conditional update makes the token one-time even under concurrency.
      const claimed = await tx.cctvGatewayPairingChallenge.updateMany({
        where: {
          gatewayId, homeId, tokenDigest, consumedAt: null,
          expiresAt: { gt: pairedAt },
          gateway: {
            gatewayType: "CCTV", cctvStatus: "PENDING", isArchived: false,
            home: { isArchived: false },
          },
        },
        data: { consumedAt: pairedAt },
      });
      if (claimed.count !== 1) return false;
      const activated = await tx.gateway.updateMany({
        where: { id: gatewayId, homeId, gatewayType: "CCTV", cctvStatus: "PENDING", isArchived: false },
        data: { cctvStatus: "ACTIVE", cctvPublicKey: input.publicKey, cctvPairedAt: pairedAt },
      });
      return activated.count === 1;
    });
    if (!paired) throw new HttpError(409, "Pairing challenge unavailable or expired");
    return Response.json({ paired: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
