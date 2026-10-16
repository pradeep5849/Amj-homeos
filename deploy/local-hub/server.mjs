import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { createLocalPairingAuthority } from "./pairing.mjs";
import { parseAllowedRelayCommand } from "./commands.mjs";
import { createCustomerSessionAuthority } from "./customer-sessions.mjs";

const bind = process.env.AMJ_LOCAL_BIND ?? "127.0.0.1";
const port = Number(process.env.AMJ_LOCAL_PORT ?? "8787");
const haUrl = process.env.AMJ_HA_URL;
const token = process.env.AMJ_HA_TOKEN;
const localApiKey = process.env.AMJ_LOCAL_API_KEY;
if (!haUrl || !token) throw new Error("AMJ_HA_URL and AMJ_HA_TOKEN required");
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid local port");
const origin = new URL(haUrl);
if (!["http:", "https:"].includes(origin.protocol) || origin.pathname !== "/" ||
    origin.username || origin.password || origin.search || origin.hash) {
  throw new Error("Invalid HA origin");
}
const timeoutMs = 5000;
const pairing = createLocalPairingAuthority();
const customerSessions = createCustomerSessionAuthority();
const relayAllowlist = new Set((process.env.AMJ_ALLOWED_RELAY_ENTITIES ?? "").split(",").map(x => x.trim()).filter(Boolean));
const entityIdPattern = /^[a-z][a-z0-9_]*\.[a-z0-9_]+$/;
const allowedDomains = new Set(["light", "switch", "fan", "sensor", "binary_sensor"]);
const jsonHeaders = { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

function send(res, status, data) {
  res.writeHead(status, jsonHeaders);
  res.end(JSON.stringify(data));
}
function authorized(req) {
  if (!localApiKey || Buffer.byteLength(localApiKey) < 32) return false;
  const auth = req.headers.authorization;
  if (typeof auth !== "string" || !auth.startsWith("Bearer ")) return false;
  const received = Buffer.from(auth.slice(7));
  const expected = Buffer.from(localApiKey);
  return received.length === expected.length && timingSafeEqual(received, expected);
}
async function haRequest(path) {
  const response = await fetch(new URL(path, origin), {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
    redirect: "error",
  });
  if (!response.ok) throw new Error("Home Assistant unavailable");
  return response.json();
}
function mapPreview(state) {
  if (!state || typeof state.entity_id !== "string" ||
      !entityIdPattern.test(state.entity_id) || !allowedDomains.has(state.entity_id.split(".")[0]) ||
      typeof state.state !== "string" || !state.attributes || typeof state.attributes !== "object" ||
      Array.isArray(state.attributes)) return null;
  const domain = state.entity_id.split(".")[0];
  return {
    entityId: state.entity_id,
    name: typeof state.attributes.friendly_name === "string"
      ? state.attributes.friendly_name.slice(0, 128) : state.entity_id,
    domain,
    available: state.state !== "unavailable" && state.state !== "unknown",
    state: state.state,
  };
}
const server = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    try {
      await haRequest("/api/");
      send(res, 200, { service: "amj-homeos-local-prototype", haReachable: true });
    } catch {
      send(res, 503, { service: "amj-homeos-local-prototype", haReachable: false });
    }
    return;
  }
  // Installer bootstrap is a development-only flow and remains loopback-only.
  // A paired token grants read-only discovery, never device commands.
  if (req.method === "POST" && req.url === "/v1/pairing/sessions") {
    if (!authorized(req)) {
      send(res, 401, { error: "Unauthorized" });
      return;
    }
    try {
      send(res, 201, pairing.issue());
    } catch {
      send(res, 429, { error: "Pairing capacity reached" });
    }
    return;
  }
  if (req.method === "POST" && req.url === "/v1/customer-sessions") {
    // Installer explicitly grants a client a subset of configured relay devices.
    if (!authorized(req)) { send(res, 401, { error: "Unauthorized" }); return; }
    let raw = "";
    try {
      for await (const chunk of req) {
        raw += chunk.toString("utf8");
        if (raw.length > 2048) { send(res, 413, { error: "Request too large" }); return; }
      }
      const input = JSON.parse(raw);
      if (!input || typeof input !== "object" || Array.isArray(input) ||
          !Array.isArray(input.allowedEntities) ||
          !input.allowedEntities.every(id => relayAllowlist.has(id))) {
        send(res, 400, { error: "Invalid device grant" }); return;
      }
      send(res, 201, customerSessions.issue(input));
    } catch {
      send(res, 400, { error: "Invalid session request" });
    }
    return;
  }
  if (req.method === "POST" && req.url === "/v1/customer-sessions/revoke") {
    if (!authorized(req)) { send(res, 401, { error: "Unauthorized" }); return; }
    let raw = "";
    try {
      for await (const chunk of req) {
        raw += chunk.toString("utf8");
        if (raw.length > 256) { send(res, 413, { error: "Request too large" }); return; }
      }
      const input = JSON.parse(raw);
      if (typeof input.sessionId !== "string") { send(res, 400, { error: "Invalid session" }); return; }
      send(res, 200, { revoked: customerSessions.revoke(input.sessionId) });
    } catch { send(res, 400, { error: "Invalid request" }); }
    return;
  }
  if (req.method === "POST" && req.url === "/v1/devices/relay") {
    // Only a host-local installer holding the bootstrap secret may issue commands.
    // Paired preview tokens never authorize physical relay operations.
    const relaySessionId = req.headers["x-amj-session-id"];
    const relayAuth = req.headers.authorization;
    const relayToken = typeof relayAuth === "string" && relayAuth.startsWith("Bearer ")
      ? relayAuth.slice(7) : "";
    if (!authorized(req) && !customerSessions.verify({
      sessionId: relaySessionId, token: relayToken,
    })) { send(res, 401, { error: "Unauthorized" }); return; }
    if (relayAllowlist.size === 0) { send(res, 403, { error: "No relays approved" }); return; }
    let raw = "";
    try {
      for await (const chunk of req) {
        raw += chunk.toString("utf8");
        if (raw.length > 1024) { send(res, 413, { error: "Request too large" }); return; }
      }
      const command = parseAllowedRelayCommand(JSON.parse(raw), relayAllowlist);
      if (!command) { send(res, 400, { error: "Invalid or unapproved relay command" }); return; }
      if (!authorized(req) && !customerSessions.verify({ sessionId: relaySessionId, token: relayToken, entityId: command.entityId })) {
        send(res, 403, { error: "Device not granted to session" }); return;
      }
      const state = await haRequest(`/api/states/${command.entityId}`);
      if (!state || state.entity_id !== command.entityId || state.state === "unavailable" || state.state === "unknown") {
        send(res, 409, { error: "Relay unavailable" }); return;
      }
      const response = await fetch(new URL(`/api/services/${command.domain}/${command.service}`, origin), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ entity_id: command.entityId }),
        signal: AbortSignal.timeout(timeoutMs),
        redirect: "error",
      });
      if (!response.ok) throw new Error("HA command failed");
      send(res, 202, { accepted: true, entityId: command.entityId, requestedPower: command.service === "turn_on" });
    } catch {
      send(res, 503, { error: "Relay command unavailable" });
    }
    return;
  }
  if (req.method !== "GET" || req.url !== "/v1/devices/preview") {
    send(res, 404, { error: "Not found" });
    return;
  }
  if (!localApiKey || Buffer.byteLength(localApiKey) < 32) {
    send(res, 503, { error: "Local API not configured" });
    return;
  }
  const sessionId = req.headers["x-amj-pairing-session"];
  const auth = req.headers.authorization;
  const paired = typeof auth === "string" && auth.startsWith("Bearer ") &&
    pairing.verify(sessionId, auth.slice(7));
  if (!authorized(req) && !paired) {
    res.setHeader("WWW-Authenticate", "Bearer");
    send(res, 401, { error: "Unauthorized" });
    return;
  }
  try {
    const states = await haRequest("/api/states");
    if (!Array.isArray(states)) throw new Error("Invalid Home Assistant response");
    const devices = states.map(mapPreview).filter(Boolean);
    send(res, 200, { devices, count: devices.length, readOnly: true });
  } catch {
    send(res, 503, { error: "Device discovery temporarily unavailable" });
  }
});
server.listen(port, bind);
