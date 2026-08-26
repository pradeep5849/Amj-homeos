import { z } from "zod";
import { errorResponse } from "@/lib/errors";
import { requireUser } from "@/lib/session";
import { adminDeleteImpact,deleteAdmin } from "@/lib/deletion";
const schema=z.object({confirmation:z.literal("DELETE")}).strict();
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){try{const actor=await requireUser();const{id}=await params;z.string().uuid().parse(id);return Response.json({impact:await adminDeleteImpact(actor,id)})}catch(error){return errorResponse(error)}}
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){try{const actor=await requireUser();const{id}=await params;z.string().uuid().parse(id);const{confirmation}=schema.parse(await request.json());await deleteAdmin(actor,id,confirmation);return Response.json({ok:true})}catch(error){return errorResponse(error)}}
