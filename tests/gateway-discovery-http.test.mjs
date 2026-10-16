import { describe, it, expect } from "vitest";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { once } from "node:events";

const apiKey = "test-local-key-with-at-least-32-characters";
const listen = (server) => new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const close = (server) => new Promise((resolve) => server.close(resolve));

describe("gateway discovery HTTP integration", () => {
  it("rejects unauthenticated requests and returns normalized HA entities", async () => {
    const ha = createServer((req, res) => {
      res.setHeader("Content-Type", "application/json");
      if (req.url === "/api/states") {
        res.end(JSON.stringify([
          { entity_id: "light.kitchen", state: "on", attributes: { friendly_name: "Kitchen" } },
          { entity_id: "cover.window", state: "closed", attributes: {} },
          { entity_id: "person.owner", state: "home", attributes: {} },
        ]));
      } else {
        res.end("{}");
      }
    });
    await listen(ha);
    const haPort = ha.address().port;
    const probe = createServer();
    await listen(probe);
    const port = probe.address().port;
    await close(probe);
    const child = spawn(process.execPath, ["deploy/local-hub/server.mjs"], {
      env: {
        ...process.env,
        AMJ_HA_URL: `http://127.0.0.1:${haPort}`,
        AMJ_HA_TOKEN: "test-token",
        AMJ_LOCAL_API_KEY: apiKey,
        AMJ_LOCAL_BIND: "127.0.0.1",
        AMJ_LOCAL_PORT: String(port),
      },
      stdio: "ignore",
    });
    const base = `http://127.0.0.1:${port}`;
    try {
      let ready = false;
      for (let attempt = 0; attempt < 60; attempt++) {
        if (child.exitCode !== null) throw new Error("Gateway process exited");
        try {
          const response = await fetch(base + "/v1/gateway/info");
          if (response.ok) { ready = true; break; }
        } catch { /* Wait for server */ }
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      expect(ready).toBe(true);
      const denied = await fetch(base + "/v1/devices/discovery");
      expect(denied.status).toBe(401);
      const response = await fetch(base + "/v1/devices/discovery", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.readOnly).toBe(true);
      expect(data.devices.map(x => x.entityId)).toEqual(["cover.window", "light.kitchen"]);
    } finally {
      child.kill();
      await Promise.race([once(child, "exit"), new Promise(resolve => setTimeout(resolve, 1000))]);
      await close(ha);
    }
  }, 15_000);
});
