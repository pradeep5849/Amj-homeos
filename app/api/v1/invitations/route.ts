import{listMyInvitations}from'@/lib/home-sharing';import{errorResponse}from'@/lib/errors';import{requireUser}from'@/lib/session';
export async function GET(){try{return Response.json({invitations:await listMyInvitations(await requireUser())})}catch(e){return errorResponse(e)}}
