import { describe, it, expect } from "vitest";
import { ruvexaHtml, ruvexaScript } from "../deploy/local-hub/ruvexa-preview.mjs";

describe("RUVEXA local device preview", () => {
  it("includes a customer session form and device inventory surface", () => {
    expect(ruvexaHtml).toContain('id="connect"');
    expect(ruvexaHtml).toContain('id="devices"');
    expect(ruvexaHtml).toContain('type="password"');
    expect(ruvexaHtml).toContain('src="/ruvexa-preview.js"');
  });
  it("offers only light/switch controls and sends scoped commands", () => {
    expect(ruvexaScript).toContain('fetch("/v1/devices/relay"');
    expect(ruvexaScript).toContain('method: "POST"');
    expect(ruvexaScript).toContain('JSON.stringify({ entityId: device.id, power })');
    expect(ruvexaScript).toContain('device.category === "lighting"');
    expect(ruvexaScript).toContain('device.category === "switches"');
    expect(ruvexaScript).toContain('device.availability === "online"');
    expect(ruvexaScript).toContain('response.status === 403');
    expect(ruvexaScript).toContain('response.status === 409');
    expect(ruvexaScript).toContain('await refresh()');
  });
  it("uses same-origin scoped session credentials and avoids persistent storage", () => {
    expect(ruvexaScript).toContain('fetch("/v1/devices/inventory"');
    expect(ruvexaScript).toContain('"X-AMJ-Session-ID"');
    expect(ruvexaScript).toContain('response.status === 401');
    expect(ruvexaScript).toContain('document.createElement');
    expect(ruvexaScript).toContain('textContent');
    expect(ruvexaScript).not.toMatch(/localStorage|sessionStorage|innerHTML|AMJ_LOCAL_API_KEY/);
  });
});
