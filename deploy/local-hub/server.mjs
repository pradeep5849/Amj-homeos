import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { createLocalPairingAuthority } from "./pairing.mjs";
import { parseAllowedRelayCommand } from "./commands.mjs";
import { createCustomerSessionAuthority } from "./customer-sessions.mjs";
import { normalizeHaEntities } from "./ha-device-discovery.mjs";
import { buildInventorySnapshot } from "./device-inventory.mjs";
import { parseAllowedFanSpeed, parseFanStageConfig } from "./fan-speed.mjs";
import { parseAllowedCurtainCommand } from "./curtain-commands.mjs";
import { parseAllowedCurtainPosition } from "./curtain-position.mjs";
import { ruvexaHtml, ruvexaScript } from "./ruvexa-preview.mjs";

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
const fanStages = parseFanStageConfig(process.env.AMJ_FAN_SPEED_STAGES ?? "");
const cameraAllowlist = new Set((process.env.AMJ_ALLOWED_CAMERA_ENTITIES ?? "").split(",").map(x => x.trim()).filter(x => /^camera\\.[a-z0-9_]+$/.test(x)));
const curtainAllowlist = new Set((process.env.AMJ_ALLOWED_CURTAIN_ENTITIES ?? "").split(",").map(x => x.trim()).filter(Boolean));
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
  // Same-origin read-only RUVEXA customer preview. Installer key is never exposed.
  if (req.method === "GET" && req.url === "/ruvexa-preview") {
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; connect-src 'self'; script-src 'self'; base-uri 'none'; form-action 'self'",
    });
    res.end(ruvexaHtml);
    return;
  }
  if (req.method === "GET" && req.url === "/ruvexa-preview.js") {
    res.writeHead(200, {
      "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(ruvexaScript);
    return;
  }
  if (req.method === "GET" && req.url === "/gateway-status.js") {
    res.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    res.end("(async () => {\n  const status = document.getElementById(\"gateway-status\");\n  const capabilities = document.getElementById(\"gateway-capabilities\");\n  try {\n    const response = await fetch(\"/v1/gateway/info\", { cache: \"no-store\" });\n    if (!response.ok) throw new Error(\"Status unavailable\");\n    const info = await response.json();\n    status.textContent = info.platform + \" — \" + (info.status === \"setup_required\" ? \"Setup required\" : \"Status available\");\n    const flags = info.capabilities || {};\n    capabilities.textContent = \"Device preview: \" + (flags.localDevicePreview ? \"Available\" : \"Unavailable\") +\n      \" · Zigbee commissioning: \" + (flags.zigbeeCommissioning ? \"Available\" : \"Not yet available\") +\n      \" · Wi-Fi commissioning: \" + (flags.wifiCommissioning ? \"Available\" : \"Not yet available\") +\n      \" · Cameras: \" + (flags.cameraIntegration ? \"Available\" : \"Not yet available\");\n  } catch {\n    status.textContent = \"Gateway information unavailable\";\n  }\n})();");
    return;
  }
  // AMJ-owned, read-only status page. No Home Assistant UI or credentials exposed.
  if (req.method === "GET" && (req.url === "/" || req.url === "/gateway")) {
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; connect-src 'self'; script-src 'self'; base-uri 'none'; form-action 'none'",
    });
    res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AMJ HomeOS | Gateway</title><style>body{margin:0;background:#0c1424;color:#eef3fa;font:16px system-ui,sans-serif}main{max-width:760px;margin:8vh auto;padding:28px}.card{background:#17243a;border:1px solid #33465d;border-radius:18px;padding:28px}h1{margin-bottom:8px}small{color:#9fb4d0}.badge{display:inline-block;background:#183d36;color:#a2f2c5;padding:8px 14px;border-radius:40px}a{color:#b7d9ff}</style></head><body><main><div class="card"><small>AMJ SMART HOME GATEWAY</small><h1>AMJ HomeOS</h1><p>Local gateway management</p><p class="badge">Gateway service running</p><p>Gateway overview</p><p id="gateway-status" aria-live="polite">Checking gateway status…</p><p id="gateway-capabilities"></p><p><small>Device commissioning and administration are not yet available on this screen.</small></p><small>This dashboard does not expose device controls or administrator credentials.</small><script src="/gateway-status.js" defer></script></div></main></body></html>`);
    return;
  }
  // Installer-only preflight: read-only and deliberately excludes secrets.
  if (req.method === "GET" && req.url === "/v1/gateway/setup/preflight") {
    if (!authorized(req)) {
      send(res, 401, { error: "Unauthorized" });
      return;
    }
    let haReachable = false;
    try {
      await haRequest("/api/");
      haReachable = true;
    } catch {
      // An unavailable integration is reported as a failed check, not a leaked error.
    }
    const checks = {
      localApiCredentialConfigured: Boolean(localApiKey && Buffer.byteLength(localApiKey) >= 32),
      homeAssistantConfigured: Boolean(haUrl && token),
      homeAssistantReachable: haReachable,
      relayAllowlistConfigured: relayAllowlist.size > 0,
    };
    send(res, 200, {
      product: "AMJ Smart Home Gateway",
      phase: "preflight_only",
      readyForCustomerActivation: false,
      checks,
    });
    return;
  }
  // Public, minimal gateway identity endpoint for RUVEXA discovery.
  // Never include hardware identifiers, network settings, tokens or HA internals.
  if (req.method === "GET" && req.url === "/v1/gateway/info") {
    send(res, 200, {
      product: "AMJ Smart Home Gateway",
      platform: "AMJ HomeOS",
      apiVersion: 1,
      status: "setup_required",
      capabilities: {
        localDevicePreview: true,
        relayControl: relayAllowlist.size > 0,
        zigbeeCommissioning: false,
        wifiCommissioning: false,
        cameraIntegration: false,
      },
    });
    return;
  }
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
    // Installer explicitly grants a client a subset of configured relay/curtain devices.
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
          !input.allowedEntities.every(id => relayAllowlist.has(id) || curtainAllowlist.has(id) || cameraAllowlist.has(id))) {
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
  // Authenticated still-image proxy only. Never expose HA tokens or remote camera URLs.
  if (req.method === "GET" && req.url?.startsWith("/v1/cameras/snapshot?")) {
    const installer = authorized(req);
    const sessionId = req.headers["x-amj-session-id"];
    const auth = req.headers.authorization;
    const sessionToken = typeof auth === "string" && auth.startsWith("Bearer ") ? auth.slice(7) : "";
    const approved = installer ? null : customerSessions.approvedEntities({ sessionId, token: sessionToken });
    if (!installer && !approved) { send(res, 401, { error: "Unauthorized" }); return; }
    const params = new URL(req.url, "http://localhost").searchParams;
    const id = params.get("entityId");
    if (params.size !== 1 || !id || !/^camera\.[a-z0-9_]+$/.test(id) || !cameraAllowlist.has(id)) {
      send(res, 400, { error: "Camera not approved" }); return;
    }
    if (!installer && !approved.has(id)) { send(res, 403, { error: "Camera not granted" }); return; }
    try {
      const state = await haRequest(`/api/states/${id}`);
      if (!state || state.entity_id !== id || ["unavailable", "unknown"].includes(state.state)) {
        send(res, 409, { error: "Camera unavailable" }); return;
      }
      const response = await fetch(new URL(`/api/camera_proxy/${id}`, origin), {
        headers: { Authorization: `Bearer ${token}`, Accept: "image/jpeg,image/png" },
        signal: AbortSignal.timeout(timeoutMs), redirect: "error",
      });
      if (!response.ok) throw new Error("Camera snapshot unavailable");
      const mime = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
      if (mime !== "image/jpeg" && mime !== "image/png") {
        send(res, 502, { error: "Unsupported snapshot format" }); return;
      }
      const declared = Number(response.headers.get("content-length"));
      if (declared > 2_000_000) { send(res, 502, { error: "Snapshot too large" }); return; }
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No snapshot body");
      const chunks = [];
      let total = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          total += value.byteLength;
          if (total > 2_000_000) {
            await reader.cancel(); send(res, 502, { error: "Snapshot too large" }); return;
          }
          chunks.push(value);
        }
      } finally { reader.releaseLock(); }
      if (total === 0) { send(res, 502, { error: "Empty snapshot" }); return; }
      res.writeHead(200, {
        "Content-Type": mime, "Cache-Control": "no-store, private",
        "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'",
      });
      res.end(Buffer.concat(chunks));
    } catch { send(res, 503, { error: "Camera snapshot unavailable" }); }
    return;
  }
  if (req.method === "POST" && req.url === "/v1/devices/curtain-position") {
    const installer = authorized(req);
    const sessionId = req.headers["x-amj-session-id"];
    const auth = req.headers.authorization;
    const sessionToken = typeof auth === "string" && auth.startsWith("Bearer ") ? auth.slice(7) : "";
    const approved = installer ? null : customerSessions.approvedEntities({ sessionId, token: sessionToken });
    if (!installer && !approved) { send(res, 401, { error: "Unauthorized" }); return; }
    let raw = "";
    try {
      for await (const chunk of req) {
        raw += chunk.toString("utf8");
        if (raw.length > 1024) { send(res, 413, { error: "Request too large" }); return; }
      }
      const command = parseAllowedCurtainPosition(JSON.parse(raw), curtainAllowlist);
      if (!command) { send(res, 400, { error: "Invalid or unapproved position" }); return; }
      if (!installer && !approved.has(command.entityId)) {
        send(res, 403, { error: "Curtain not granted" }); return;
      }
      const state = await haRequest(`/api/states/${command.entityId}`);
      if (!state || state.entity_id !== command.entityId ||
          ["unknown", "unavailable"].includes(state.state)) {
        send(res, 409, { error: "Curtain unavailable" }); return;
      }
      if (!Number.isInteger(state.attributes?.supported_features) ||
          (state.attributes.supported_features & 4) === 0) {
        send(res, 409, { error: "Position not supported" }); return;
      }
      const response = await fetch(new URL("/api/services/cover/set_cover_position", origin), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ entity_id: command.entityId, position: command.position }),
        signal: AbortSignal.timeout(timeoutMs), redirect: "error",
      });
      if (!response.ok) throw new Error("HA curtain position failed");
      send(res, 202, { accepted: true, entityId: command.entityId, requestedPosition: command.position });
    } catch { send(res, 503, { error: "Curtain position unavailable" }); }
    return;
  }
  // Covers must be explicitly allowed and granted to the customer session.
  if (req.method === "POST" && req.url === "/v1/devices/curtain") {
    const installer = authorized(req);
    const sessionId = req.headers["x-amj-session-id"];
    const auth = req.headers.authorization;
    const sessionToken = typeof auth === "string" && auth.startsWith("Bearer ") ? auth.slice(7) : "";
    const approved = installer ? null : customerSessions.approvedEntities({ sessionId, token: sessionToken });
    if (!installer && !approved) { send(res, 401, { error: "Unauthorized" }); return; }
    let raw = "";
    try {
      for await (const chunk of req) {
        raw += chunk.toString("utf8");
        if (raw.length > 1024) { send(res, 413, { error: "Request too large" }); return; }
      }
      const command = parseAllowedCurtainCommand(JSON.parse(raw), curtainAllowlist);
      if (!command) { send(res, 400, { error: "Invalid or unapproved curtain command" }); return; }
      if (!installer && !approved.has(command.entityId)) {
        send(res, 403, { error: "Curtain not granted to session" }); return;
      }
      const state = await haRequest(`/api/states/${command.entityId}`);
      if (!state || state.entity_id !== command.entityId ||
          ["unknown", "unavailable"].includes(state.state)) {
        send(res, 409, { error: "Curtain unavailable" }); return;
      }
      const features = state.attributes?.supported_features;
      const requiredFlag = command.action === "open" ? 1 : command.action === "close" ? 2 : 8;
      if (!Number.isInteger(features) || (features & requiredFlag) === 0) {
        send(res, 409, { error: "Curtain action unsupported" }); return;
      }
      const response = await fetch(new URL(`/api/services/cover/${command.service}`, origin), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ entity_id: command.entityId }),
        signal: AbortSignal.timeout(timeoutMs), redirect: "error",
      });
      if (!response.ok) throw new Error("HA curtain command failed");
      send(res, 202, { accepted: true, entityId: command.entityId, requestedAction: command.action });
    } catch {
      send(res, 503, { error: "Curtain command unavailable" });
    }
    return;
  }
  // Installer/customer-scoped fan speed control; no generic HA service proxy.
  if (req.method === "POST" && req.url === "/v1/devices/fan-speed") {
    const installer = authorized(req);
    const sessionId = req.headers["x-amj-session-id"];
    const auth = req.headers.authorization;
    const sessionToken = typeof auth === "string" && auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!installer && !customerSessions.verify({ sessionId, token: sessionToken })) {
      send(res, 401, { error: "Unauthorized" }); return;
    }
    let raw = "";
    try {
      for await (const chunk of req) {
        raw += chunk.toString("utf8");
        if (raw.length > 1024) { send(res, 413, { error: "Request too large" }); return; }
      }
      const command = parseAllowedFanSpeed(JSON.parse(raw), relayAllowlist, fanStages);
      if (!command) { send(res, 400, { error: "Invalid or unapproved fan command" }); return; }
      if (!installer && !customerSessions.verify({
        sessionId, token: sessionToken, entityId: command.entityId,
      })) { send(res, 403, { error: "Fan not granted to session" }); return; }
      const state = await haRequest(`/api/states/${command.entityId}`);
      if (!state || state.entity_id !== command.entityId ||
          state.state === "unavailable" || state.state === "unknown") {
        send(res, 409, { error: "Fan unavailable" }); return;
      }
      // HA feature flag 1 denotes SET_SPEED support for fan entities.
      if (!state.attributes || typeof state.attributes.supported_features !== "number" ||
          !(state.attributes.supported_features & 1)) {
        send(res, 409, { error: "Fan speed not supported" }); return;
      }
      const response = await fetch(new URL("/api/services/fan/set_percentage", origin), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ entity_id: command.entityId, percentage: command.percentage }),
        signal: AbortSignal.timeout(timeoutMs), redirect: "error",
      });
      if (!response.ok) throw new Error("HA fan command failed");
      send(res, 202, { accepted: true, entityId: command.entityId, ...(command.stage === undefined ? { requestedPercentage: command.percentage } : { requestedStage: command.stage }) });
    } catch {
      send(res, 503, { error: "Fan speed command unavailable" });
    }
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
  // Installer sees the full read-only inventory; a customer session sees only
  // devices explicitly approved by the installer, never all Home Assistant states.
  if (req.method === "GET" && req.url === "/v1/devices/inventory") {
    const installer = authorized(req);
    const sessionId = req.headers["x-amj-session-id"];
    const auth = req.headers.authorization;
    const sessionToken = typeof auth === "string" && auth.startsWith("Bearer ") ? auth.slice(7) : "";
    const approved = installer ? null : customerSessions.approvedEntities({ sessionId, token: sessionToken });
    if (!installer && !approved) { send(res, 401, { error: "Unauthorized" }); return; }
    try {
      const devices = normalizeHaEntities(await haRequest("/api/states"), { fanStages });
      const visible = installer ? devices : devices.filter(device => approved.has(device.entityId));
      send(res, 200, buildInventorySnapshot(visible));
    } catch {
      send(res, 503, { error: "Device inventory temporarily unavailable" });
    }
    return;
  }
  // Installer-only, read-only inventory; no lock/cover control or credentials.
  if (req.method === "GET" && req.url === "/v1/devices/discovery") {
    if (!authorized(req)) { send(res, 401, { error: "Unauthorized" }); return; }
    try {
      const states = await haRequest("/api/states");
      const devices = normalizeHaEntities(states, { fanStages });
      send(res, 200, { devices, count: devices.length, readOnly: true });
    } catch {
      send(res, 503, { error: "Device discovery temporarily unavailable" });
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
