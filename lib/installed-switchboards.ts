import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { HttpError } from "./errors";
import { homeAccess } from "./homes";

type Actor={id:string;role:"SUPER_ADMIN"|"ADMIN"|"HOME_OWNER"|"HOME_USER"};
type Protocol="WIFI"|"ZIGBEE";
type CatalogChannel={id:string;position:number;controlType:string;defaultLabel:string;capabilities:unknown};
type BoardRow={id:string;homeId:string;roomId:string;catalogModelId:string;protocol:Protocol;name:string;externalBoardId:string|null;isOnline:boolean;lastSeenAt:Date|null;brand:string;moduleSize:string;configurationCode:string;configurationLabel:string};
type ChannelRow={id:string;switchboardId:string;catalogChannelId:string;deviceId:string|null;label:string;position:number;controlType:string;capabilities:unknown;deviceName:string|null;state:unknown;deviceCapabilities:unknown;healthStatus:string|null;isOnline:boolean|null};

function strings(value:unknown){return Array.isArray(value)?value.filter((x):x is string=>typeof x==="string"):[]}
function object(value:unknown){return value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{} }
function deviceType(controlType:string){return controlType==="FAN"?"FAN":controlType==="SWITCH"||controlType==="SOCKET"||controlType==="HEAVY_SWITCH"||controlType==="DOORBELL"?"SWITCH":"OTHER" as const}
function initialState(capabilities:string[]){const state:Record<string,unknown>={};if(capabilities.includes("power"))state.power=false;if(capabilities.includes("speed"))state.speed=0;if(capabilities.includes("brightness"))state.brightness=0;return state}

export async function listInstalledSwitchboards(actor:Actor,homeId:string){
 await homeAccess(actor,homeId);
 const boards=await prisma.$queryRaw<BoardRow[]>(Prisma.sql`SELECT b."id",b."homeId",b."roomId",b."catalogModelId",b."protocol",b."name",b."externalBoardId",b."isOnline",b."lastSeenAt",m."brand",m."moduleSize",m."configurationCode",m."configurationLabel" FROM "InstalledSwitchboard" b JOIN "SwitchboardCatalogModel" m ON m."id"=b."catalogModelId" WHERE b."homeId"=${homeId}::uuid AND b."isArchived"=false ORDER BY b."createdAt"`);
 if(!boards.length)return [];
 const ids=boards.map(b=>b.id);
 const channels=await prisma.$queryRaw<ChannelRow[]>(Prisma.sql`SELECT ic."id",ic."switchboardId",ic."catalogChannelId",ic."deviceId",ic."label",cc."position",cc."controlType",cc."capabilities",d."name" AS "deviceName",d."state",d."capabilities" AS "deviceCapabilities",d."healthStatus",d."isOnline" FROM "InstalledSwitchboardChannel" ic JOIN "SwitchboardCatalogChannel" cc ON cc."id"=ic."catalogChannelId" LEFT JOIN "Device" d ON d."id"=ic."deviceId" WHERE ic."switchboardId" IN (${Prisma.join(ids)}) ORDER BY ic."switchboardId",cc."position"`);
 return boards.map(board=>({...board,channels:channels.filter(c=>c.switchboardId===board.id).map(c=>({...c,capabilities:strings(c.capabilities),device:c.deviceId?{id:c.deviceId,name:c.deviceName??c.label,state:object(c.state),capabilities:strings(c.deviceCapabilities),healthStatus:c.healthStatus??"UNKNOWN",isOnline:Boolean(c.isOnline)}:null}))}));
}

export async function createInstalledSwitchboard(actor:Actor,input:{homeId:string;roomId:string;catalogModelId:string;protocol:Protocol;name:string;externalBoardId?:string|null}){
 await homeAccess(actor,input.homeId,true);
 const room=await prisma.room.findFirst({where:{id:input.roomId,homeId:input.homeId},select:{id:true}});if(!room)throw new HttpError(400,"Room must belong to the selected Home");
 const models=await prisma.$queryRaw<{id:string;brand:string;configurationCode:string}[]>(Prisma.sql`SELECT "id","brand","configurationCode" FROM "SwitchboardCatalogModel" WHERE "id"=${input.catalogModelId}::uuid AND "isActive"=true LIMIT 1`);if(!models.length)throw new HttpError(404,"Switchboard catalog model not found");
 const supported=await prisma.$queryRaw<{id:string}[]>(Prisma.sql`SELECT "id" FROM "SwitchboardCatalogProtocol" WHERE "catalogModelId"=${input.catalogModelId}::uuid AND "protocol"=${input.protocol}::"DeviceProtocol" AND "isActive"=true LIMIT 1`);if(!supported.length)throw new HttpError(400,"Selected protocol is not supported by this switchboard model");
 const catalogChannels=await prisma.$queryRaw<CatalogChannel[]>(Prisma.sql`SELECT "id","position","controlType","defaultLabel","capabilities" FROM "SwitchboardCatalogChannel" WHERE "catalogModelId"=${input.catalogModelId}::uuid ORDER BY "position"`);if(!catalogChannels.length)throw new HttpError(400,"Switchboard model has no controls");
 const boardId=randomUUID(),model=models[0];
 await prisma.$transaction(async tx=>{
  await tx.$executeRaw(Prisma.sql`INSERT INTO "InstalledSwitchboard" ("id","homeId","roomId","catalogModelId","protocol","name","externalBoardId","isOnline","isArchived","createdAt","updatedAt") VALUES (${boardId}::uuid,${input.homeId}::uuid,${input.roomId}::uuid,${input.catalogModelId}::uuid,${input.protocol}::"DeviceProtocol",${input.name.trim()},${input.externalBoardId??null},false,false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`);
  for(const channel of catalogChannels){const capabilities=strings(channel.capabilities),deviceId=randomUUID(),installedChannelId=randomUUID(),label=channel.defaultLabel;await tx.device.create({data:{id:deviceId,homeId:input.homeId,roomId:input.roomId,name:`${input.name.trim()} · ${label}`,deviceType:deviceType(channel.controlType),protocol:input.protocol,manufacturer:model.brand,model:model.configurationCode,externalDeviceId:input.externalBoardId?`${input.externalBoardId}:${channel.position}`:null,capabilities,state:initialState(capabilities)}});await tx.$executeRaw(Prisma.sql`INSERT INTO "InstalledSwitchboardChannel" ("id","switchboardId","catalogChannelId","deviceId","label","createdAt","updatedAt") VALUES (${installedChannelId}::uuid,${boardId}::uuid,${channel.id}::uuid,${deviceId}::uuid,${label},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`)}
 });
 return boardId;
}
