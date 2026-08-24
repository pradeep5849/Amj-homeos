import { createDevice, listDevices } from "@/lib/devices";
import { errorResponse } from "@/lib/errors";
import { requireUser } from "@/lib/session";
import { createDeviceSchema } from "@/lib/validation";
export async function POST(request: Request) { try { const actor = await requireUser(); const input = createDeviceSchema.parse(await request.json()); return Response.json({ device: await createDevice(actor, input) }, { status: 201 }); } catch (error) { return errorResponse(error); } }
export async function GET() { try { return Response.json({ devices: await listDevices(await requireUser()) }); } catch (error) { return errorResponse(error); } }
