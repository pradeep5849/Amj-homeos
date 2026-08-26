import { z } from "zod";
import { errorResponse } from "@/lib/errors";
import { requireUser } from "@/lib/session";
import { removeSwitchboard } from "@/lib/deletion";
export async function DELETE(_request:Request,{params}:{params:Promise<{homeId:string;boardId:string}>}){try{const actor=await requireUser();const{homeId,boardId}=await params;z.string().uuid().parse(homeId);z.string().uuid().parse(boardId);await removeSwitchboard(actor,homeId,boardId);return Response.json({ok:true})}catch(error){return errorResponse(error)}}
