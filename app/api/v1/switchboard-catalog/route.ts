import { z } from "zod";
import { errorResponse } from "@/lib/errors";
import { requireUser } from "@/lib/session";
import { createSwitchboardCatalogModel, listSwitchboardCatalog } from "@/lib/switchboard-catalog";

const controlType=z.enum(["SWITCH","FAN","SOCKET","HEAVY_SWITCH","DOORBELL","SCENE"]);
const channel=z.object({position:z.number().int().min(1).max(64),controlType,defaultLabel:z.string().trim().min(1).max(100),capabilities:z.array(z.enum(["power","brightness","speed"])).min(1).max(3)}).strict();
const createSchema=z.object({brand:z.string().trim().min(1).max(100),moduleSize:z.string().trim().min(1).max(30),configurationCode:z.string().trim().min(1).max(100),displayName:z.string().trim().min(2).max(150),configurationLabel:z.string().trim().min(1).max(150),protocols:z.array(z.enum(["WIFI","ZIGBEE"])).min(1).max(2).refine(v=>new Set(v).size===v.length,"Duplicate protocol"),needsCodeVerification:z.boolean().optional(),channels:z.array(channel).min(1).max(64).refine(v=>new Set(v.map(c=>c.position)).size===v.length,"Duplicate channel position")}).strict();

export async function GET(request:Request){try{const actor=await requireUser();const url=new URL(request.url);const includeInactive=url.searchParams.get("includeInactive")==="true";return Response.json({models:await listSwitchboardCatalog(actor,{includeInactive})});}catch(error){return errorResponse(error)}}
export async function POST(request:Request){try{const actor=await requireUser();const input=createSchema.parse(await request.json());const id=await createSwitchboardCatalogModel(actor,input);return Response.json({id},{status:201});}catch(error){return errorResponse(error)}}
