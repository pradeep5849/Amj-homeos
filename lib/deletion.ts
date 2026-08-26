import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { HttpError } from "./errors";
import { homeAccess } from "./homes";

type Actor={id:string;role:"SUPER_ADMIN"|"ADMIN"|"HOME_OWNER"|"HOME_USER"};

export async function adminDeleteImpact(actor:Actor,adminId:string){
 if(actor.role!=="SUPER_ADMIN")throw new HttpError(403,"Super Admin access required");
 const admin=await prisma.user.findFirst({where:{id:adminId,role:"ADMIN"},select:{id:true,name:true,adminProfile:{select:{isDefaultAdmin:true,_count:{select:{assignedHomeOwners:true}}}}}});if(!admin)throw new HttpError(404,"Admin not found");
 return {id:admin.id,name:admin.name,isDefaultAdmin:Boolean(admin.adminProfile?.isDefaultAdmin),assignedHomeOwners:admin.adminProfile?._count.assignedHomeOwners??0,canDelete:!admin.adminProfile?.isDefaultAdmin&&(admin.adminProfile?._count.assignedHomeOwners??0)===0};
}
export async function deleteAdmin(actor:Actor,adminId:string,confirmation:string){
 if(confirmation!=="DELETE")throw new HttpError(400,"Type DELETE to confirm");const impact=await adminDeleteImpact(actor,adminId);if(!impact.canDelete)throw new HttpError(409,impact.isDefaultAdmin?"Choose another Default Admin first":"Reassign or remove this Admin's Home Owners first");await prisma.user.delete({where:{id:adminId}});
}
export async function homeOwnerDeleteImpact(actor:Actor,ownerId:string){
 if(actor.role!=="ADMIN"&&actor.role!=="SUPER_ADMIN")throw new HttpError(403,"Admin access required");
 const owner=await prisma.user.findFirst({where:{id:ownerId,role:"HOME_OWNER",...(actor.role==="ADMIN"?{homeOwnerProfile:{assignedAdminId:actor.id}}:{})},select:{id:true,name:true,_count:{select:{homeMemberships:true}},homeMemberships:{where:{role:"OWNER"},select:{homeId:true}}}});if(!owner)throw new HttpError(404,"Home Owner not found");
 const ownedHomes=owner.homeMemberships.length;return {id:owner.id,name:owner.name,ownedHomes,memberships:owner._count.homeMemberships,canDelete:ownedHomes===0&&owner._count.homeMemberships===0};
}
export async function deleteHomeOwner(actor:Actor,ownerId:string,confirmation:string){if(confirmation!=="DELETE")throw new HttpError(400,"Type DELETE to confirm");const impact=await homeOwnerDeleteImpact(actor,ownerId);if(!impact.canDelete)throw new HttpError(409,"Remove or transfer this Home Owner's Home memberships before permanent deletion");await prisma.user.delete({where:{id:ownerId}})}

export async function deleteRoom(actor:Actor,homeId:string,roomId:string){await homeAccess(actor,homeId,true);if(actor.role==="HOME_USER")throw new HttpError(403,"Home Owner access required");const room=await prisma.room.findFirst({where:{id:roomId,homeId},select:{id:true}});if(!room)throw new HttpError(404,"Room not found");const [devices,boards]=await Promise.all([prisma.device.count({where:{roomId,isArchived:false}}),prisma.$queryRaw<{count:bigint}[]>(Prisma.sql`SELECT COUNT(*)::bigint AS count FROM "InstalledSwitchboard" WHERE "roomId"=${roomId}::uuid AND "isArchived"=false`)]);if(devices||Number(boards[0]?.count??0))throw new HttpError(409,"Remove or move this Room's devices and switchboards first");await prisma.room.delete({where:{id:roomId}})}

export async function removeSwitchboard(actor:Actor,homeId:string,boardId:string){await homeAccess(actor,homeId,true);if(actor.role==="HOME_USER")throw new HttpError(403,"Home Owner access required");const rows=await prisma.$queryRaw<{id:string;deviceId:string|null}[]>(Prisma.sql`SELECT c."id",c."deviceId" FROM "InstalledSwitchboardChannel" c JOIN "InstalledSwitchboard" b ON b."id"=c."switchboardId" WHERE b."id"=${boardId}::uuid AND b."homeId"=${homeId}::uuid AND b."isArchived"=false`);const ids=rows.flatMap(r=>r.deviceId?[r.deviceId]:[]);if(ids.length){const refs=await prisma.$queryRaw<{n:bigint}[]>(Prisma.sql`SELECT ((SELECT COUNT(*) FROM "SceneAction" WHERE "deviceId" IN (${Prisma.join(ids)}))+(SELECT COUNT(*) FROM "AutomationAction" WHERE "deviceId" IN (${Prisma.join(ids)}))+(SELECT COUNT(*) FROM "AutomationTrigger" WHERE "deviceId" IN (${Prisma.join(ids)}))+(SELECT COUNT(*) FROM "Timer" WHERE "deviceId" IN (${Prisma.join(ids)})))::bigint AS n`);if(Number(refs[0]?.n??0)>0)throw new HttpError(409,"Remove this switchboard from Scenes, Automations and Timers first");}
 await prisma.$transaction(async tx=>{if(ids.length)await tx.device.updateMany({where:{id:{in:ids}},data:{isArchived:true}});await tx.$executeRaw(Prisma.sql`UPDATE "InstalledSwitchboard" SET "isArchived"=true,"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=${boardId}::uuid AND "homeId"=${homeId}::uuid`)});
}
