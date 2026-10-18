import { prisma } from "@/lib/db";
import { errorResponse, HttpError } from "@/lib/errors";
import { homeAccess } from "@/lib/homes";
import { requireUser } from "@/lib/session";
import { hashGatewayEnrollmentCode, newGatewayEnrollmentCode } from "@/lib/cctv/gateway-enrollment-crypto";

type Context = { params: Promise<{ homeId: string }> };
const EXPIRY_MINUTES = 10;

/**
 * Home owners/admins may issue one short-lived pairing code.
 * The plaintext code is returned once and must never be logged or persisted.
 */
export async function POST(_request: Request, context: Context) {
  try {
    const actor = await requireUser();
    const { homeId } = await context.params;
    const home = await homeAccess(actor, homeId, true);
    if (home.isArchived) throw new HttpError(409, "Home is archived");
    const pepper = process.env.CCTV_GATEWAY_ENROLLMENT_PEPPER;
    if (!pepper || pepper.length < 32) throw new HttpError(503, "CCTV gateway enrollment is not configured");
    const code = newGatewayEnrollmentCode();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + EXPIRY_MINUTES * 60_000);
    await prisma.$transaction(async tx => {
      await tx.cctvGatewayEnrollmentCode.updateMany({
        where: { homeId, consumedAt: null, revokedAt: null, expiresAt: { gt: now } },
        data: { revokedAt: now },
      });
      await tx.cctvGatewayEnrollmentCode.create({
        data: { homeId, codeHash: hashGatewayEnrollmentCode(code, pepper), expiresAt },
      });
    });
    return Response.json({ code, expiresAt: expiresAt.toISOString() }, {
      status: 201,
      headers: { "Cache-Control": "no-store", "Pragma": "no-cache" },
    });
  } catch (error) { return errorResponse(error); }
}
