import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { PrismaClient, type Role } from "@prisma/client";

const url = process.env.DATABASE_TEST_URL;
if (!url) throw new Error("DATABASE_TEST_URL is required; HTTP integration tests never skip");
const prisma = new PrismaClient({ datasources: { db: { url } } });
const port = 3214, base = `http://127.0.0.1:${port}`, password = "stage4-http-password";
const server = spawn("./node_modules/.bin/next", ["dev", "-p", String(port)], { env: { ...process.env, DATABASE_URL: url, SESSION_SECRET: "stage4-http-test-session-secret-32-chars", HOMEOS_TEST_PROVIDERS: "disabled" }, stdio: ["ignore", "pipe", "pipe"] });

async function waitForServer() { for (let i=0;i<60;i++){try{if((await fetch(base+"/sign-in")).ok)return}catch{} await new Promise(r=>setTimeout(r,500))} throw new Error("HTTP server did not start") }
async function user(role:Role,email:string){return prisma.user.create({data:{email,normalizedEmail:email,passwordHash:await bcrypt.hash(password,4),name:email,role}})}
async function signIn(email:string){const r=await fetch(base+"/api/v1/auth/sign-in",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,password})});assert.equal(r.status,200);return r.headers.get("set-cookie")!.split(";",1)[0]}
async function api(path:string,cookie:string,method="GET",body?:unknown){return fetch(base+path,{method,headers:{cookie,...(body?{"content-type":"application/json"}:{})},body:body?JSON.stringify(body):undefined})}

async function main() {
try {
  await waitForServer();
  const superAdmin=await user("SUPER_ADMIN","super@http.test"), admin1=await user("ADMIN","admin1@http.test"),admin2=await user("ADMIN","admin2@http.test"),ownerA=await user("HOME_OWNER","owner-a@http.test"),ownerB=await user("HOME_OWNER","owner-b@http.test"),wife=await user("HOME_USER","wife@http.test");
  await prisma.adminProfile.createMany({data:[{userId:admin1.id,isDefaultAdmin:true},{userId:admin2.id}]}); await prisma.homeOwnerProfile.createMany({data:[{userId:ownerA.id,assignedAdminId:admin1.id},{userId:ownerB.id,assignedAdminId:admin2.id}]});
  const home1=await prisma.home.create({data:{name:"Home 1",timezone:"UTC",memberships:{create:[{userId:ownerA.id,role:"OWNER"},{userId:wife.id,role:"MEMBER"}]}}});
  const home2=await prisma.home.create({data:{name:"Home 2",timezone:"UTC",memberships:{create:{userId:ownerA.id,role:"OWNER"}}}});
  const home3=await prisma.home.create({data:{name:"Home 3",timezone:"UTC",memberships:{create:{userId:ownerB.id,role:"OWNER"}}}});
  const room1=await prisma.room.create({data:{homeId:home1.id,name:"Living",normalizedName:"living"}}),room3=await prisma.room.create({data:{homeId:home3.id,name:"Other",normalizedName:"other"}});
  const cookies={super:await signIn(superAdmin.email),admin1:await signIn(admin1.email),ownerA:await signIn(ownerA.email),ownerB:await signIn(ownerB.email),wife:await signIn(wife.email)};
  const start=async(homeId:string,cookie:string,type="WIFI_BLE")=>api(`/api/v1/homes/${homeId}/onboarding/sessions`,cookie,"POST",{onboardingType:type});
  const ownerSession=await start(home1.id,cookies.ownerA);assert.equal(ownerSession.status,201);const session=(await ownerSession.json()).session;
  assert.equal((await start(home1.id,cookies.wife)).status,403);assert.equal((await start(home1.id,cookies.admin1)).status,201);assert.equal((await start(home3.id,cookies.admin1)).status,403);assert.equal((await start(home3.id,cookies.super)).status,201);
  assert.equal((await api(`/api/v1/onboarding/sessions/${session.id}`,cookies.ownerB)).status,403);assert.equal((await api(`/api/v1/onboarding/sessions/${session.id}`,cookies.admin1)).status,200);
  const unavailable=await api(`/api/v1/onboarding/sessions/${session.id}/complete`,cookies.ownerA,"POST",{ssid:"Home",wifiPassword:"temporary-only",roomId:room1.id,name:"Switch"});const unavailableText=await unavailable.text();assert.equal(unavailable.status,200);assert.match(unavailableText,/NOT_CONFIGURED|REQUIRES_DEVICE_SPEC/);assert(!unavailableText.includes("temporary-only"));
  const cancelledResponse=await start(home2.id,cookies.ownerA,"TUYA");const cancelled=(await cancelledResponse.json()).session;assert.equal((await api(`/api/v1/onboarding/sessions/${cancelled.id}/cancel`,cookies.ownerA,"POST")).status,200);assert.equal((await api(`/api/v1/onboarding/sessions/${cancelled.id}/complete`,cookies.ownerA,"POST",{})).status,409);
  const expired=await prisma.deviceOnboardingSession.create({data:{homeId:home1.id,initiatedByUserId:ownerA.id,onboardingType:"TUYA",protocol:"TUYA",expiresAt:new Date(Date.now()-1000)}});assert.equal((await api(`/api/v1/onboarding/sessions/${expired.id}/complete`,cookies.ownerA,"POST",{})).status,409);
  assert.equal((await start(home1.id,cookies.ownerA,"TUYA")).status,201);const tuyaResponse=await start(home1.id,cookies.ownerA,"TUYA"),tuya=(await tuyaResponse.json()).session;assert.match(await (await api(`/api/v1/onboarding/sessions/${tuya.id}/complete`,cookies.ownerA,"POST",{})).text(),/TUYA_PROVIDER_NOT_CONFIGURED/);
  const gatewayBody={homeId:home1.id,name:"Gateway",gatewayType:"ZIGBEE",connectionType:"ETHERNET"};const gatewayResponse=await api("/api/v1/gateways",cookies.ownerA,"POST",gatewayBody);assert.equal(gatewayResponse.status,201);const gateway=(await gatewayResponse.json()).gateway;assert.equal((await api("/api/v1/gateways",cookies.wife,"POST",gatewayBody)).status,403);assert.equal((await api(`/api/v1/gateways/${gateway.id}/pairing`,cookies.wife,"POST")).status,403);assert.equal((await api(`/api/v1/gateways/${gateway.id}`,cookies.ownerB)).status,403);assert.equal((await api(`/api/v1/gateways/${gateway.id}`,cookies.admin1)).status,200);
  const pairing=await api(`/api/v1/gateways/${gateway.id}/pairing`,cookies.ownerA,"POST");assert.match(await pairing.text(),/GATEWAY_PROVIDER_NOT_CONFIGURED/);assert.equal((await start(home1.id,cookies.ownerA)).status,201);assert.equal(room3.homeId,home3.id);
  const columns=await prisma.$queryRaw<{column_name:string}[]>`SELECT column_name FROM information_schema.columns WHERE table_name='DeviceOnboardingSession'`;assert(!columns.some(c=>c.column_name.toLowerCase().includes("password")));
  console.log("Stage 4 real HTTP authorization and fail-closed integration: PASS");
} finally { server.kill("SIGTERM"); await prisma.$disconnect(); }

}
main().catch((error) => { console.error(error); process.exitCode = 1; });
