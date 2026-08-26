import { z } from "zod";
import { errorResponse } from "@/lib/errors";
import { requireUser } from "@/lib/session";
import { createInstalledSwitchboard,listInstalledSwitchboards } from "@/lib/installed-switchboards";

// Seeded catalog IDs are deterministic PostgreSQL UUIDs made from md5 values. They are
// valid database UUIDs, but they do not necessarily carry an RFC version nibble, so
// z.string().uuid() rejects them before the install service can run.
const databaseUuid=z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,"Invalid database ID");
const createSchema=z.object({roomId:z.string().uuid(),catalogModelId:databaseUuid,protocol:z.enum(["WIFI","ZIGBEE","TUYA"]),name:z.string().trim().min(2).max(100),externalBoardId:z.string().trim().min(1).max(255).nullable().optional()}).strict();
export async function GET(_request:Request,{params}:{params:Promise<{homeId:string}>}){try{const actor=await requireUser(),{homeId}=await params;z.string().uuid().parse(homeId);return Response.json({switchboards:await listInstalledSwitchboards(actor,homeId)});}catch(error){return errorResponse(error)}}
export async function POST(request:Request,{params}:{params:Promise<{homeId:string}>}){try{const actor=await requireUser(),{homeId}=await params;z.string().uuid().parse(homeId);const input=createSchema.parse(await request.json());const id=await createInstalledSwitchboard(actor,{homeId,...input});return Response.json({id},{status:201});}catch(error){return errorResponse(error)}}
