import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import { HttpError, errorResponse } from "@/lib/errors";
import { verifyGatewayRequest } from "@/lib/cctv/gateway-request-auth";
import { safeCameraReport } from "@/lib/cctv/gateway-camera-report";

type Context = { params: Promise<{ homeId: string; gatewayId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { homeId, gatewayId } = await context.params;
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > 4096) throw new HttpError(413, "Report too large");
    const report = safeCameraReport(JSON.parse(raw));
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
    if (!verifyGatewayRequest({
      homeId, gatewayId, method: "POST", path: new URL(request.url).pathname,
      timestamp, nonce, signature,
      bodyHash: createHash("sha256").update(raw).digest("hex"),
      publicKey: gateway.cctvPublicKey,
    })) throw new HttpError(401, "Invalid gateway signature");

    // Camera ownership is verified before replay nonce consumption. Only
    // registered cameras for this home may receive gateway reports.
    const camera = await prisma.camera.findFirst({
      where: { id: report.cameraId, homeId, cctvGatewayId: gatewayId, isArchived: false },
      select: { id: true },
    });
    if (!camera) throw new HttpError(404, "Camera not found");

    try {
      await prisma.$transaction(async tx => {
      await tx.cctvGatewayRequestNonce.create({ data: { homeId, gatewayId, nonce } });
      const updated = await tx.camera.updateMany({
        where: { id: report.cameraId, homeId, isArchived: false },
        data: { connectionStatus: report.connectionStatus, capabilities: report.capabilities },
      });
      if (updated.count !== 1) throw new HttpError(409, "Camera state changed");
      });
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
        throw new HttpError(409, "Gateway request replayed");
      }
      throw error;
    }
    return Response.json({ accepted: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
