import { describe, it, expect } from "vitest";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { once } from "node:events";

const apiKey = "test-local-key-with-at-least-32-characters";
const listen = server => new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const close = server => new Promise(resolve => server.close(resolve));

describe("curtain position and camera snapshot HTTP authorization", () => {
  it("restricts camera stills and curtain commands to installer-granted entities", async () => {
    const commands = [];
    const ha = createServer((req, res) => {
      if (req.url === "/api/camera_proxy/camera.driveway") {
        res.writeHead(200, { "Content-Type": "image/jpeg" });
        res.end(Buffer.from([0xff, 0xd8, 0xff, 0xd9])); return;
      }
      res.setHeader("Content-Type", "application/json");
      if (req.url === "/api/states") {
        res.end(JSON.stringify([
          { entity_id: "camera.driveway", state: "idle", attributes: {} },
          { entity_id: "camera.private", state: "idle", attributes: {} },
          { entity_id: "cover.bedroom", state: "open", attributes: { supported_features: 15, current_position: 45 } },
          { entity_id: "cover.private", state: "open", attributes: { supported_features: 15 } },
        ])); return;
      }
      if (req.url?.startsWith("/api/states/")) {
        const id = req.url.slice("/api/states/".length);
        res.end(JSON.stringify({ entity_id: id, state: "open",
          attributes: { supported_features: 15 } })); return;
      }
      if (req.url === "/api/services/cover/set_cover_position" && req.method === "POST") {
        let body = "";
        req.on("data", chunk => { body += chunk; });
        req.on("end", () => { commands.push(JSON.parse(body)); res.end("[]"); });
        return;
      }
      res.statusCode = 404; res.end("{}");
    });
    await listen(ha);
    const probe = createServer(); await listen(probe);
    const port = probe.address().port; await close(probe);
    const child = spawn(process.execPath, ["deploy/local-hub/server.mjs"], {
      env: { ...process.env, AMJ_HA_URL: `http://127.0.0.1:${ha.address().port}`,
        AMJ_HA_TOKEN: "test-token", AMJ_LOCAL_API_KEY: apiKey,
        AMJ_ALLOWED_CAMERA_ENTITIES: "camera.driveway,camera.private",
        AMJ_ALLOWED_CURTAIN_ENTITIES: "cover.bedroom,cover.private",
        AMJ_LOCAL_BIND: "127.0.0.1", AMJ_LOCAL_PORT: String(port) },
      stdio: "ignore",
    });
    const base = `http://127.0.0.1:${port}`;
    try {
      let ready = false;
      for (let attempt = 0; attempt < 60; attempt++) {
        if (child.exitCode !== null) throw new Error("Gateway exited");
        try { if ((await fetch(base + "/v1/gateway/info")).ok) { ready = true; break; } } catch {}
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      expect(ready).toBe(true);
      expect((await fetch(base + "/v1/cameras/snapshot?entityId=camera.driveway")).status).toBe(401);
      const issued = await fetch(base + "/v1/customer-sessions", {
        method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: "customer01", allowedEntities: ["camera.driveway", "cover.bedroom"] }),
      });
      expect(issued.status).toBe(201);
      const session = await issued.json();
      const headers = { Authorization: `Bearer ${session.token}`, "X-AMJ-Session-ID": session.sessionId };
      const inventory = await fetch(base + "/v1/devices/inventory", { headers });
      expect(inventory.status).toBe(200);
      expect((await inventory.json()).devices.map(x => x.id)).toEqual(["camera.driveway", "cover.bedroom"]);
      const snapshot = await fetch(base + "/v1/cameras/snapshot?entityId=camera.driveway", { headers });
      expect(snapshot.status).toBe(200);
      expect(snapshot.headers.get("content-type")).toBe("image/jpeg");
      expect(snapshot.headers.get("cache-control")).toContain("no-store");
      expect((await snapshot.arrayBuffer()).byteLength).toBe(4);
      expect((await fetch(base + "/v1/cameras/snapshot?entityId=camera.private", { headers })).status).toBe(403);
      const sendPosition = (entityId, position) => fetch(base + "/v1/devices/curtain-position", {
        method: "POST", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ entityId, position }),
      });
      expect((await sendPosition("cover.private", 50)).status).toBe(403);
      expect((await sendPosition("cover.bedroom", 101)).status).toBe(400);
      expect((await sendPosition("cover.bedroom", 60)).status).toBe(202);
      expect(commands).toEqual([{ entity_id: "cover.bedroom", position: 60 }]);
    } finally {
      child.kill();
      await Promise.race([once(child, "exit"), new Promise(resolve => setTimeout(resolve, 1000))]);
      await close(ha);
    }
  }, 15_000);
});
