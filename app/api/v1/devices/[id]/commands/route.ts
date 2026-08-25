import { randomUUID } from "node:crypto";
import { applyLogicalDeviceCommand } from "@/lib/device-commands";
import { deviceAccess } from "@/lib/devices";
import { evaluateDeviceStateAutomations } from "@/lib/automations";
import { errorResponse } from "@/lib/errors";
import { requireUser } from "@/lib/session";
export async function POST(request:Request,context:{params:Promise<{id:string}>}){try{const actor=await requireUser(),{id}=await context.params;await deviceAccess(actor,id);const result=await applyLogicalDeviceCommand(id,await request.json());if(result.oldValue!==result.newValue)await evaluateDeviceStateAutomations(result.device.homeId,id,result.capability,result.newValue,{correlationId:randomUUID(),depth:0,fired:new Set()});return Response.json({device:result.device,execution:"LOGICAL_STATE_ONLY"})}catch(error){return errorResponse(error)}}
