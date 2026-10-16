import { createServer } from "node:http";

const bind = process.env.AMJ_LOCAL_BIND ?? "127.0.0.1";
const port = Number(process.env.AMJ_LOCAL_PORT ?? "8787");
const haUrl = process.env.AMJ_HA_URL;
const token = process.env.AMJ_HA_TOKEN;
if (!haUrl || !token) throw new Error("AMJ_HA_URL and AMJ_HA_TOKEN required");
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid local port");
const origin = new URL(haUrl);
if (!["http:", "https:"].includes(origin.protocol) || origin.pathname !== "/" ||
    origin.username || origin.password || origin.search || origin.hash) {
  throw new Error("Invalid HA origin");
}
const timeoutMs = 5000;

const server = createServer(async (req, res) => {
  // Health only: deliberately NO device listing, command dispatch, or token-bearing APIs.
  // Future device APIs require explicit authenticated local pairing.
  if (req.method !== "GET" || req.url !== "/health") {
    res.writeHead(404, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(JSON.stringify({ error: "Not found" }));
    return;
  }
  let haReachable = false;
  try {
    const response = await fetch(new URL("/api/", origin), {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "error",
    });
    haReachable = response.ok;
  } catch {
    // Never disclose credentials or network details in health responses.
  }
  res.writeHead(haReachable ? 200 : 503, {
    "Content-Type": "application/json", "Cache-Control": "no-store",
  });
  res.end(JSON.stringify({ service: "amj-homeos-local-prototype", haReachable }));
});
server.listen(port, bind);
