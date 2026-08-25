import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { HttpError } from "./errors";
import { deviceCommandSchema } from "./validation";

export type LogicalCommandInput={command:"setPower";value:boolean}|{command:"setBrightness";value:number}|{command:"setSpeed";value:number};
const capabilityByCommand={setPower:"power",setBrightness:"brightness",setSpeed:"speed"} as const;
export async function applyLogicalDeviceCommand(deviceId:string,raw:unknown){
 const input=deviceCommandSchema.parse(raw) as LogicalCommandInput;
 const device=await prisma.device.findUnique({where:{id:deviceId},select:{id:true,homeId:true,isArchived:true,capabilities:true,state:true}});
 if(!device)throw new HttpError(404,"Device not found");if(device.isArchived)throw new HttpError(409,"Archived Devices cannot receive commands");
 const capability=capabilityByCommand[input.command];if(!(device.capabilities as string[]).includes(capability))throw new HttpError(400,"Device does not support this command");
 const oldValue=(device.state as Record<string,unknown>)[capability],state={...(device.state as Record<string,unknown>),[capability]:input.value} as Prisma.InputJsonValue;
 const updated=await prisma.device.update({where:{id:deviceId},data:{state}});return{device:updated,capability,oldValue,newValue:input.value};
}
