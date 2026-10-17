import { EventEmitter } from "node:events";
import { describe, expect, it } from "vitest";
import { connectRtspSession } from "../lib/cctv/rtsp-connection";
import type { Socket } from "node:net";

class FakeRtspCameraSocket extends EventEmitter {
  sent: string[] = [];
  setTimeout() { return this; }
  connect() { queueMicrotask(() => this.emit("connect")); return this; }
  destroy() { return this; }
  write(data: string) {
    this.sent.push(data);
    const cseq = this.sent.length;
    const headers = cseq === 2
      ? "Session: session123\r\nTransport: RTP/AVP/TCP;unicast;interleaved=0-1\r\n"
      : cseq === 3 ? "Session: session123\r\n" : "";
    queueMicrotask(() => {
      this.emit("data", Buffer.from("RTSP/1.0 200 OK\r\nCSeq: " + cseq + "\r\n" + headers + "\r\n"));
      if (cseq === 3) {
        const packet = Buffer.alloc(12);
        packet[0] = 0x80;
        packet[1] = 96;
        packet.writeUInt16BE(42, 2);
        const frame = Buffer.alloc(16);
        frame[0] = 0x24;
        frame[1] = 0;
        frame.writeUInt16BE(12, 2);
        packet.copy(frame, 4);
        this.emit("data", frame);
      }
    });
    return true;
  }
}

describe("RTSP simulated camera socket", () => {
  it("performs DESCRIBE, SETUP, PLAY and receives RTP", async () => {
    const fake = new FakeRtspCameraSocket();
    const result = await connectRtspSession({
      endpoint: { host: "192.168.1.50", rtspPort: 554, onvifPort: 80 },
      streamUri: "rtsp://192.168.1.50/live",
      mediaControlUri: "rtsp://192.168.1.50/track1",
      socketFactory: () => fake as unknown as Socket,
    });
    expect(fake.sent.map(line => line.split(" ")[0])).toEqual(["DESCRIBE", "SETUP", "PLAY"]);
    expect(fake.sent[2]).toContain("Session: session123");
    expect(result.state).toBe("STREAMING");
    expect(result.events.some(event => event.type === "rtp" && event.sequence === 42)).toBe(true);
  });
});
