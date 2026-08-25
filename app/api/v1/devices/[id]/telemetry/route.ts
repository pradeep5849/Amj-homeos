import { TelemetryMetric } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { deviceAccess } from "@/lib/devices";
import { errorResponse, HttpError } from "@/lib/errors";
import { requireUser } from "@/lib/session";
const querySchema = z.object({ metric: z.enum(TelemetryMetric).optional(), from: z.coerce.date().optional(), to: z.coerce.date().optional(), limit: z.coerce.number().int().min(1).max(500).default(100) }).strict();
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try { const actor = await requireUser(), { id } = await context.params; await deviceAccess(actor, id); const url = new URL(request.url); const query = querySchema.parse(Object.fromEntries(url.searchParams)); const to = query.to ?? new Date(), from = query.from ?? new Date(to.getTime() - 7 * 86_400_000); if (to < from || to.getTime() - from.getTime() > 90 * 86_400_000) throw new HttpError(400, "Telemetry range must be at most 90 days"); const telemetry = await prisma.deviceTelemetry.findMany({ where: { deviceId: id, ...(query.metric ? { metric: query.metric } : {}), recordedAt: { gte: from, lte: to } }, orderBy: { recordedAt: "desc" }, take: query.limit, select: { id: true, metric: true, value: true, unit: true, recordedAt: true, receivedAt: true, quality: true } }); return Response.json({ telemetry, range: { from, to }, limit: query.limit }); } catch (error) { return errorResponse(error); }
}
