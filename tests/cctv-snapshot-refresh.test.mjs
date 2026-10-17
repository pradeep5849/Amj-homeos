import { describe, expect, it } from "vitest";
import { ruvexaHtml, ruvexaScript } from "../deploy/local-hub/ruvexa-preview.mjs";
describe("RUVEXA camera still refresh", () => {
  it("labels periodic still refresh honestly, without claiming video streaming", () => {
    expect(ruvexaScript).toContain("Start 5-second still refresh");
    expect(ruvexaScript).toContain("Stop still refresh");
    expect(ruvexaScript).toContain("This is not a live video stream");
    expect(ruvexaScript).toContain("}, 5000)");
  });
  it("avoids refreshing hidden or disconnected cameras and clears timers", () => {
    expect(ruvexaScript).toContain("if (!document.hidden) loadCameraSnapshot");
    expect(ruvexaScript).toContain("!picture.isConnected");
    expect(ruvexaScript).toContain("stopCameraRefresh()");
    expect(ruvexaScript).toContain("cameraRefreshTimers.delete(timer)");
    expect(ruvexaScript).toContain("URL.revokeObjectURL");
    expect(ruvexaHtml).toContain("RUVEXA");
  });
});
