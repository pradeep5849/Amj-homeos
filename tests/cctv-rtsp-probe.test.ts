import { describe, expect, it } from "vitest";
import { EventEmitter } from "node:events";
import { parseRtspOptionsResponse, probeRtspOptions } from "../gateway/cctv/rtsp-probe.mjs";
describe("local RTSP OPTIONS probe", () => {
  it("parses status and supported methods with matching CSeq", () => {
    expect(parseRtspOptionsResponse("RTSP/1.0 200 OK\r\nCSeq: 42\r\nPublic: OPTIONS, DESCRIBE, SETUP, PLAY\r\n\r\n", 42))
      .toEqual({ status: 200, methods: ["OPTIONS", "DESCRIBE", "SETUP", "PLAY"] });
    expect(() => parseRtspOptionsResponse("RTSP/1.0 200 OK\r\nCSeq: 2\r\n\r\n", 42)).toThrow();
  });
  it("rejects unsafe RTSP targets before creating a socket", async () => {
    await expect(probeRtspOptions({ uri: "rtsp://8.8.8.8/live", sourceAddress: "8.8.8.8" })).rejects.toThrow();
    await expect(probeRtspOptions({ uri: "rtsp://user:pass@192.168.1.20/live", sourceAddress: "192.168.1.20" })).rejects.toThrow();
  });
  it("performs bounded local OPTIONS exchange", async () => {
    class FakeSocket extends EventEmitter {
      remoteAddress = "192.168.1.20";
      setTimeout() {}
      destroy() {}
      write(request: string) {
        const cseq = /CSeq: (\d+)/.exec(request)?.[1];
        this.emit("data", Buffer.from(`RTSP/1.0 401 Unauthorized\r\nCSeq: ${cseq}\r\n\r\n`));
      }
    }
    const connect = (() => {
      const socket = new FakeSocket();
      queueMicrotask(() => socket.emit("connect"));
      return socket;
    }) as never;
    const result = await probeRtspOptions({ uri: "rtsp://192.168.1.20/live", sourceAddress: "192.168.1.20", connect });
    expect(result).toEqual({ status: 401, methods: [] });
  });
});
