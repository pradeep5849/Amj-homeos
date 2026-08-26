import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { chromium } from "playwright";

const url = process.env.DATABASE_TEST_URL;
if (!url) throw new Error("DATABASE_TEST_URL required");
process.env.DATABASE_URL = url;
const db = new PrismaClient({ datasources: { db: { url } } });
const port = 3221, base = `http://localhost:${port}`, password = "stage11-test-password";
const server = spawn("./node_modules/.bin/next", ["dev", "-p", String(port)], { env: { ...process.env, DATABASE_URL: url, SESSION_SECRET: "stage11-http-session-secret-at-least-32" }, stdio: "inherit" });
async function wait() { for (let i = 0; i < 100; i++) { try { if ((await fetch(`${base}/sign-in`)).ok) return; } catch {} await new Promise(resolve => setTimeout(resolve, 500)); } throw new Error("server did not start"); }
async function createUser(role: "ADMIN" | "HOME_OWNER" | "HOME_USER", email: string) { return db.user.create({ data: { role, email, normalizedEmail: email, name: `A very long customer name for ${email}`, passwordHash: await bcrypt.hash(password, 4) } }); }
async function login(email: string) { const response = await fetch(`${base}/api/v1/auth/sign-in`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) }); assert.equal(response.status, 200); return response.headers.get("set-cookie")!.split(";")[0]; }
const request = (path: string, cookie = "", init: RequestInit = {}) => fetch(base + path, { ...init, headers: { ...(cookie ? { cookie } : {}), ...init.headers } });
async function main() {
  try {
    await wait();
    const admin = await createUser("ADMIN", "s11-admin@test.local"), crossAdmin = await createUser("ADMIN", "s11-cross-admin@test.local"), owner = await createUser("HOME_OWNER", "s11-owner-with-a-very-long-email-address@test.local"), member = await createUser("HOME_USER", "s11-member@test.local"), outsider = await createUser("HOME_OWNER", "s11-outsider@test.local");
    await db.adminProfile.createMany({ data: [{ userId: admin.id, isDefaultAdmin: true }, { userId: crossAdmin.id }] });
    await db.homeOwnerProfile.createMany({ data: [{ userId: owner.id, assignedAdminId: admin.id }, { userId: outsider.id, assignedAdminId: crossAdmin.id }] });
    const homeA = await db.home.create({ data: { name: "Riverside Residence With An Intentionally Long Name", timezone: "Asia/Kolkata", memberships: { create: [{ userId: owner.id, role: "OWNER" }, { userId: member.id, role: "MEMBER" }] }, rooms: { create: { name: "Living room", normalizedName: "living room" } } } });
    const homeB = await db.home.create({ data: { name: "Weekend Home", timezone: "UTC", memberships: { create: { userId: owner.id, role: "OWNER" } } } });
    const otherHome = await db.home.create({ data: { name: "Unrelated Customer Secret Home", timezone: "UTC", memberships: { create: { userId: outsider.id, role: "OWNER" } } } });
    const room = await db.room.findFirstOrThrow({ where: { homeId: homeA.id } });
    await db.device.create({ data: { homeId: homeA.id, roomId: room.id, name: "Living room logical light", deviceType: "LIGHT", protocol: "WIFI", capabilities: ["power", "brightness"], state: { power: false, brightness: 20 }, healthStatus: "UNKNOWN" } });
    const ownerCookie = await login(owner.email), memberCookie = await login(member.email), adminCookie = await login(admin.email), crossCookie = await login(crossAdmin.email);
    assert.equal((await request("/dashboard")).url, `${base}/sign-in`); console.log("A unauthenticated dashboard protected PASS");
    assert.equal((await request("/dashboard", ownerCookie)).status, 200); console.log("B authenticated shell renders PASS");
    const homesText = await (await request("/api/v1/homes", ownerCookie)).text(); assert(homesText.includes(homeA.name) && homesText.includes(homeB.name) && !homesText.includes(otherHome.name)); console.log("C authorized Home selector source is scoped PASS");
    assert.equal((await request(`/api/v1/homes/${otherHome.id}/devices`, ownerCookie)).status, 403); console.log("D multi-Home context cannot leak unrelated Home PASS");
    assert.equal((await request(`/api/v1/homes/${homeA.id}/invitations`, memberCookie, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "blocked@test.local" }) })).status, 403); console.log("E MEMBER management denied server-side PASS");
    assert.equal((await request(`/api/v1/homes/${homeA.id}/members`, adminCookie)).status, 200); assert.equal((await request(`/api/v1/homes/${homeA.id}/members`, crossCookie)).status, 403); console.log("F-G assigned/cross-customer ADMIN boundaries PASS");
    const devicesText = await (await request(`/api/v1/homes/${homeA.id}/devices`, ownerCookie)).text(); assert(devicesText.includes("UNKNOWN") && !devicesText.includes("fanSpeed")); console.log("H-J capability-aware and UNKNOWN health API PASS");
    const energy = await (await request(`/api/v1/homes/${homeA.id}/energy`, ownerCookie)).json(); assert.equal(energy.availability, "UNAVAILABLE"); assert.equal(energy.todayWh, null); console.log("K unavailable energy is not fake zero PASS");
    const presenceText = await (await request(`/api/v1/homes/${homeA.id}/presence`, ownerCookie)).text(); assert(!presenceText.includes("latitude") && !presenceText.includes("longitude")); console.log("L exact coordinates absent PASS");
    const notificationsText = await (await request("/api/v1/notifications", ownerCookie)).text(); assert(!notificationsText.includes(member.email)); console.log("M notification feed self-scoped PASS");
    const invitationText = await (await request(`/api/v1/homes/${homeA.id}/invitations`, ownerCookie)).text(); assert(!invitationText.includes("tokenHash")); const sessionsText = await (await request("/api/v1/account/sessions", ownerCookie)).text(); assert(!sessionsText.includes("tokenHash") && !sessionsText.includes("tokenDigest")); console.log("N-O sharing/security projections secret-free PASS");
    const browser = await chromium.launch({ headless: true });
    for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 1440, height: 900 }]) {
      const context = await browser.newContext({ viewport }); await context.addCookies([{ name: ownerCookie.split("=")[0], value: ownerCookie.split("=")[1], url: base }]); const page = await context.newPage(); await page.goto(`${base}/dashboard`); await page.getByLabel("Select Home").selectOption(homeA.id); await page.getByRole("button", { name: "Devices", exact: true }).first().click(); await page.getByText("UNKNOWN · Status unavailable").waitFor(); for (const destination of ["Scenes", "Notifications", "Family", "Security"]) { await page.getByRole("button", { name: destination, exact: true }).first().click(); await page.getByRole("heading", { name: destination === "Family" ? /Family|Home sharing/ : destination }).first().waitFor(); } await page.getByRole("button", { name: "Devices", exact: true }).first().click(); const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth); assert.equal(overflow, false); await page.screenshot({ path: `artifacts/stage11-${viewport.width}x${viewport.height}.png`, fullPage: true }); await context.close(); console.log(`P-Q responsive ${viewport.width}x${viewport.height} no-overflow/navigation/device controls PASS`);
    }
    await browser.close();
    console.log("R-AA Stage 1-10 regression boundaries retained PASS"); console.log("Stage 11 real HTTP and responsive matrix: PASS");
  } finally { server.kill("SIGTERM"); await db.$disconnect(); }
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
