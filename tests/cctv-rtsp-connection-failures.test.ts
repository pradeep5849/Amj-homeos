import { EventEmitter } from "node:events";
import type { Socket } from "node:net";
import { describe, expect, it } from "vitest";
import { connectRtspSession } from "../lib/cctv/rtsp-connection";

class RejectingCamera extends EventEmitter {
  setTimeout() { return this; }
  connect() { queueMicrotask(() => this.emit("connect")); return this; }
  destroy() { return this; }
  write(_data: string) {
    queueMicrotask(() => this.emit("data", Buffer.from("RTSP/1.0 401 Unauthorized\r\nCSeq: 1\r\n\r\n")));
    return true;
  }
}
class DisconnectingCamera extends EventEmitter {
  setTimeout() { return this; }
  connect() { queueMicrotask(() => this.emit("connect")); return this; }
  destroy() { return this; }
  write(_data: string) {
    queueMicrotask(() => this.emit("close"));
    return true;
  }
}
const base = {
  endpoint: { host: "192.168.1.50", rtspPort: 554, onvifPort: 80 },
  streamUri: "rtsp://192.168.1.50/live",
  mediaControlUri: "rtsp://192.168.1.50/track1",
};
describe("RTSP gateway connection failures", () => {
  it("fails closed on unauthenticated camera challenge", async () => {
    await expect(connectRtspSession({
      ...base, socketFactory: () => new RejectingCamera() as unknown as Socket,
    })).rejects.toThrow("RTSP negotiation rejected");
  });
  it("rejects a connection that closes before receiving media", async () => {
    await expect(connectRtspSession({
      ...base, socketFactory: () => new DisconnectingCamera() as unknown as Socket,
    })).rejects.toThrow("closed before first RTP");
  });
  it("rejects RTSP destination mismatches before connecting", async () => {
    await expect(connectRtspSession({
      ...base, streamUri: "rtsp://192.168.1.51/live",
      socketFactory: () => { throw new Error("Socket should not be created"); },
    })).rejects.toThrow("Unexpected RTSP stream destination");
  });
});
