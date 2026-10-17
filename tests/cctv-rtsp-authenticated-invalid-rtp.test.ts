import { EventEmitter } from "node:events";
import type { Socket } from "node:net";
import { describe, expect, it } from "vitest";
import { probeAuthenticatedRtsp } from "../lib/cctv/rtsp-authenticated-connection";

class InvalidRtpCamera extends EventEmitter {
  private sent = 0;
  setTimeout() { return this; }
  connect() { queueMicrotask(() => this.emit("connect")); return this; }
  destroy() { return this; }
  write(data: string) {
    this.sent++;
    const sequence = Number(/CSeq: (\d+)/.exec(data)?.[1]);
    const headers = this.sent === 2
      ? "Session: s123\r\nTransport: RTP/AVP/TCP;unicast;interleaved=0-1\r\n"
      : this.sent === 3 ? "Session: s123\r\n" : "";
    queueMicrotask(() => {
      this.emit("data", Buffer.from("RTSP/1.0 200 OK\r\nCSeq: " + sequence +
        "\r\n" + headers + "\r\n"));
      if (this.sent === 3) {
        const invalidRtp = Buffer.alloc(12);
        invalidRtp[0] = 0x90;
        const frame = Buffer.alloc(16);
        frame[0] = 0x24;
        frame.writeUInt16BE(12, 2);
        invalidRtp.copy(frame, 4);
        this.emit("data", frame);
      }
    });
    return true;
  }
}

describe("Authenticated RTSP media validation", () => {
  it("rejects truncated RTP extensions after PLAY", async () => {
    const camera = new InvalidRtpCamera();
    await expect(probeAuthenticatedRtsp({
      endpoint: { host: "192.168.1.50", rtspPort: 554, onvifPort: 80 },
      streamUri: "rtsp://192.168.1.50/live",
      mediaControlUri: "rtsp://192.168.1.50/track1",
      credentials: { username: "viewer", password: "example-only" },
      socketFactory: () => camera as unknown as Socket,
    })).rejects.toThrow("Truncated RTP extension");
  });
});
