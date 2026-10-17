import { EventEmitter } from "node:events";
import type { Socket } from "node:net";
import { describe, expect, it } from "vitest";
import { probeAuthenticatedRtsp } from "../lib/cctv/rtsp-authenticated-connection";

class FakeDigestCamera extends EventEmitter {
  sent: string[] = [];
  setTimeout() { return this; }
  connect() { queueMicrotask(() => this.emit("connect")); return this; }
  destroy() { return this; }
  write(data: string) {
    this.sent.push(data);
    const count = this.sent.length;
    const sequence = Number(/CSeq: (\d+)/.exec(data)?.[1]);
    const extra = count === 1
      ? 'WWW-Authenticate: Digest realm="camera", nonce="abc", algorithm=SHA-256, qop="auth"\r\n'
      : count === 3
        ? "Session: session123\r\nTransport: RTP/AVP/TCP;unicast;interleaved=0-1\r\n"
        : count === 4 ? "Session: session123\r\n" : "";
    queueMicrotask(() => {
      this.emit("data", Buffer.from("RTSP/1.0 " + (count === 1 ? "401 Unauthorized" : "200 OK") +
        "\r\nCSeq: " + sequence + "\r\n" + extra + "\r\n"));
      if (count === 4) {
        const packet = Buffer.alloc(12);
        packet[0] = 0x80;
        packet[1] = 96;
        const frame = Buffer.alloc(16);
        frame[0] = 0x24;
        frame.writeUInt16BE(12, 2);
        packet.copy(frame, 4);
        this.emit("data", frame);
      }
    });
    return true;
  }
}

describe("RTSP authenticated camera socket", () => {
  it("retries Digest DESCRIBE then completes SETUP and PLAY", async () => {
    const camera = new FakeDigestCamera();
    const result = await probeAuthenticatedRtsp({
      endpoint: { host: "192.168.1.50", rtspPort: 554, onvifPort: 80 },
      streamUri: "rtsp://192.168.1.50/live",
      mediaControlUri: "rtsp://192.168.1.50/track1",
      credentials: { username: "viewer", password: "example-only" },
      socketFactory: () => camera as unknown as Socket,
    });
    expect(camera.sent.map(line => line.split(" ")[0])).toEqual([
      "DESCRIBE", "DESCRIBE", "SETUP", "PLAY",
    ]);
    expect(camera.sent[1]).toContain("Authorization: Digest ");
    expect(camera.sent[2]).toContain("interleaved=0-1");
    expect(camera.sent[3]).toContain("Session: session123");
    expect(result).toEqual({ authenticated: true, firstMediaBytes: 12 });
  });
});
