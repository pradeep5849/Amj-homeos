import { z } from "zod";
import { errorResponse } from "@/lib/errors";
import { requireUser } from "@/lib/session";
import { updateSwitchboardCatalogModel } from "@/lib/switchboard-catalog";

const updateSchema=z.object({displayName:z.string().trim().min(2).max(150).optional(),configurationLabel:z.string().trim().min(1).max(150).optional(),isActive:z.boolean().optional(),needsCodeVerification:z.boolean().optional()}).strict().refine(v=>Object.keys(v).length>0,"At least one change is required");
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){try{const actor=await requireUser();const{id}=await params;z.string().uuid().parse(id);await updateSwitchboardCatalogModel(actor,id,updateSchema.parse(await request.json()));return Response.json({ok:true});}catch(error){return errorResponse(error)}}
