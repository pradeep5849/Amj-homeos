import type { HomeInvitationStatus, Prisma, Role } from "@prisma/client";
import { prisma } from "./db";
import { HttpError } from "./errors";
import { homeAccess } from "./homes";
import { hashToken, newRawToken } from "./token";
import { normalizeEmail } from "./validation";

type Actor={id:string;role:Role;normalizedEmail?:string};
export const INVITATION_TTL_MS=7*24*60*60*1000;
const invitationSelect={id:true,homeId:true,normalizedEmail:true,role:true,status:true,invitedByUserId:true,acceptedByUserId:true,createdAt:true,expiresAt:true,acceptedAt:true,rejectedAt:true,cancelledAt:true} as const;

export async function expireInvitations(now=new Date()){
  const expired=await prisma.homeInvitation.findMany({where:{status:"PENDING",expiresAt:{lte:now}},select:{id:true,homeId:true}});
  let count=0;
  for(const invitation of expired){
    await prisma.$transaction(async tx=>{const claim=await tx.homeInvitation.updateMany({where:{id:invitation.id,status:"PENDING",expiresAt:{lte:now}},data:{status:"EXPIRED"}});if(claim.count){count++;await tx.homeSharingAudit.create({data:{homeId:invitation.homeId,invitationId:invitation.id,eventType:"INVITATION_EXPIRED"}})}});
  }
  return count;
}

export async function createInvitation(actor:Actor,homeId:string,email:string){
  await homeAccess(actor,homeId,true);
  const normalizedEmail=normalizeEmail(email),now=new Date();
  await prisma.homeInvitation.updateMany({where:{homeId,normalizedEmail,status:"PENDING",expiresAt:{lte:now}},data:{status:"EXPIRED"}});
  if(await prisma.homeMembership.findFirst({where:{homeId,user:{normalizedEmail,isActive:true}},select:{id:true}}))throw new HttpError(409,"User is already a Home member");
  const rawToken=newRawToken(),expiresAt=new Date(now.getTime()+INVITATION_TTL_MS);
  const invitation=await prisma.$transaction(async tx=>{const row=await tx.homeInvitation.create({data:{homeId,normalizedEmail,role:"MEMBER",tokenHash:hashToken(rawToken),invitedByUserId:actor.id,expiresAt},select:invitationSelect});await tx.homeSharingAudit.create({data:{homeId,actorUserId:actor.id,invitationId:row.id,eventType:"INVITATION_CREATED"}});return row});
  return {invitation,token:rawToken};
}

export async function listHomeInvitations(actor:Actor,homeId:string){await homeAccess(actor,homeId,true);await expireInvitations();return prisma.homeInvitation.findMany({where:{homeId},select:invitationSelect,orderBy:{createdAt:"desc"}})}
export async function listMyInvitations(actor:Actor){const user=await prisma.user.findUniqueOrThrow({where:{id:actor.id},select:{normalizedEmail:true}});await expireInvitations();return prisma.homeInvitation.findMany({where:{normalizedEmail:user.normalizedEmail},select:{...invitationSelect,home:{select:{id:true,name:true}}},orderBy:{createdAt:"desc"}})}

async function tokenInvitation(actor:Actor,token:string){const user=await prisma.user.findUniqueOrThrow({where:{id:actor.id},select:{id:true,normalizedEmail:true,isActive:true}});if(!user.isActive)throw new HttpError(403,"Inactive account");const invitation=await prisma.homeInvitation.findUnique({where:{tokenHash:hashToken(token)},select:{...invitationSelect,tokenHash:true}});if(!invitation)throw new HttpError(404,"Invitation not found");if(invitation.normalizedEmail!==user.normalizedEmail)throw new HttpError(403,"Invitation is addressed to another account");if(invitation.status!=="PENDING")throw new HttpError(409,"Invitation is no longer pending");if(invitation.expiresAt<=new Date()){await prisma.$transaction(async tx=>{const claim=await tx.homeInvitation.updateMany({where:{id:invitation.id,status:"PENDING"},data:{status:"EXPIRED"}});if(claim.count)await tx.homeSharingAudit.create({data:{homeId:invitation.homeId,invitationId:invitation.id,eventType:"INVITATION_EXPIRED"}})});throw new HttpError(410,"Invitation expired")}return {invitation,user}}

export async function acceptInvitation(actor:Actor,token:string){const {invitation,user}=await tokenInvitation(actor,token);return prisma.$transaction(async tx=>{const now=new Date(),claim=await tx.homeInvitation.updateMany({where:{id:invitation.id,status:"PENDING",expiresAt:{gt:now}},data:{status:"ACCEPTED",acceptedByUserId:user.id,acceptedAt:now}});if(!claim.count)throw new HttpError(409,"Invitation was already used");const membership=await tx.homeMembership.create({data:{homeId:invitation.homeId,userId:user.id,role:"MEMBER"},select:{id:true,homeId:true,userId:true,role:true,createdAt:true}});await tx.homeSharingAudit.create({data:{homeId:invitation.homeId,actorUserId:user.id,affectedUserId:user.id,invitationId:invitation.id,eventType:"INVITATION_ACCEPTED"}});const pref=await tx.notificationPreference.findUnique({where:{userId:invitation.invitedByUserId}});if(pref?.inAppEnabled!==false&&pref?.systemEventsEnabled!==false)await tx.notification.create({data:{userId:invitation.invitedByUserId,homeId:invitation.homeId,type:"SYSTEM",title:"Member joined your Home",body:"An invited member accepted Home access.",metadata:{invitationId:invitation.id,event:"MEMBER_JOINED"}}});return membership})}

export async function rejectInvitation(actor:Actor,token:string){const {invitation,user}=await tokenInvitation(actor,token);const now=new Date();const claim=await prisma.$transaction(async tx=>{const c=await tx.homeInvitation.updateMany({where:{id:invitation.id,status:"PENDING",expiresAt:{gt:now}},data:{status:"REJECTED",rejectedAt:now}});if(c.count)await tx.homeSharingAudit.create({data:{homeId:invitation.homeId,actorUserId:user.id,invitationId:invitation.id,eventType:"INVITATION_REJECTED"}});return c.count});if(!claim)throw new HttpError(409,"Invitation is no longer pending")}
export async function cancelInvitation(actor:Actor,homeId:string,id:string){await homeAccess(actor,homeId,true);const now=new Date();const count=await prisma.$transaction(async tx=>{const c=await tx.homeInvitation.updateMany({where:{id,homeId,status:"PENDING",expiresAt:{gt:now}},data:{status:"CANCELLED",cancelledAt:now}});if(c.count)await tx.homeSharingAudit.create({data:{homeId,actorUserId:actor.id,invitationId:id,eventType:"INVITATION_CANCELLED"}});return c.count});if(!count)throw new HttpError(409,"Pending invitation not found")}

export async function listMembers(actor:Actor,homeId:string){await homeAccess(actor,homeId,true);return prisma.homeMembership.findMany({where:{homeId},select:{id:true,homeId:true,role:true,createdAt:true,user:{select:{id:true,name:true,email:true,isActive:true}}},orderBy:{createdAt:"asc"}})}
export async function removeMember(actor:Actor,homeId:string,membershipId:string){await homeAccess(actor,homeId,true);if(actor.role==="ADMIN")throw new HttpError(403,"Only a Home Owner or Super Admin can remove members");const membership=await prisma.homeMembership.findFirst({where:{id:membershipId,homeId},select:{id:true,userId:true,role:true}});if(!membership)throw new HttpError(404,"Membership not found");if(membership.role!=="MEMBER")throw new HttpError(409,"Ownership transfer is not implemented in Stage 9");await prisma.$transaction(async tx=>{await tx.homeMembership.deleteMany({where:{id:membership.id,homeId,role:"MEMBER"}});await tx.homeSharingAudit.create({data:{homeId,actorUserId:actor.id,affectedUserId:membership.userId,eventType:"MEMBER_REMOVED"}});const pref=await tx.notificationPreference.findUnique({where:{userId:membership.userId}});if(pref?.inAppEnabled!==false&&pref?.systemEventsEnabled!==false)await tx.notification.create({data:{userId:membership.userId,homeId,type:"SYSTEM",title:"Home access removed",body:"A Home manager removed your membership.",metadata:{event:"MEMBER_REMOVED",homeId}}})})}
export type SafeInvitationStatus=HomeInvitationStatus; export type SafeAuditWhere=Prisma.HomeSharingAuditWhereInput;
