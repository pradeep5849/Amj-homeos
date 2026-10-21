import net from "node:net";
import { randomBytes } from "node:crypto";
import { parseStreamUriResponse } from "./onvif-stream-uri.mjs";

const MAX_RESPONSE = 16 * 1024;
export function parseRtspOptionsResponse(raw, expectedCseq) {
  if (typeof raw !== "string" || Buffer.byteLength(raw) > MAX_RESPONSE) throw new Error("Invalid RTSP response size");
  const end = raw.indexOf("\r\n\r\n");
  if (end < 0) throw new Error("Incomplete RTSP response");
  const header = raw.slice(0, end);
  const lines = header.split("\r\n");
  const match = /^RTSP\/1\.0 ([1-5][0-9]{2})(?:\s|$)/.exec(lines.shift() ?? "");
  if (!match) throw new Error("Invalid RTSP status line");
  const cseq = lines.find(line => /^CSeq\s*:/i.test(line));
  if (!cseq || cseq.split(":").slice(1).join(":").trim() !== String(expectedCseq)) throw new Error("RTSP CSeq mismatch");
  const status = Number(match[1]);
  const methods = lines.find(line => /^Public\s*:/i.test(line))?.split(":").slice(1).join(":").split(",").map(s => s.trim().toUpperCase()).filter(s => /^[A-Z_]+$/.test(s)) ?? [];
  return { status, methods };
}
/**
 * Diagnostic-only local RTSP OPTIONS handshake. No credentials, DESCRIBE, SETUP,
 * PLAY, or media sockets. This must not be exposed as an arbitrary URL API.
 */
export async function probeRtspOptions({ uri, sourceAddress, timeoutMs = 3000, connect = net.createConnection }) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 10000) throw new Error("Invalid RTSP timeout");
  const { host, port } = parseStreamUriResponse(`<Uri>${uri}</Uri>`, sourceAddress);
  const cseq = randomBytes(4).readUInt32BE(0) || 1;
  // Never echo the full URI into logs; it may contain a sensitive query.
  const request = `OPTIONS ${uri} RTSP/1.0\r\nCSeq: ${cseq}\r\nUser-Agent: AMJ-HomeOS-CCTV-Gateway\r\n\r\n`;
  return await new Promise((resolve, reject) => {
    const socket = connect({ host, port, family: 4 });
    let settled = false;
    let buffer = "";
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (error) reject(error);
      else resolve(value);
    };
    socket.setTimeout(timeoutMs);
    socket.on("timeout", () => finish(new Error("RTSP probe timed out")));
    socket.on("error", () => finish(new Error("RTSP connection failed")));
    socket.on("connect", () => {
      if (socket.remoteAddress !== host) return finish(new Error("RTSP peer address mismatch"));
      socket.write(request);
    });
    socket.on("data", chunk => {
      buffer += chunk.toString("latin1");
      if (Buffer.byteLength(buffer, "latin1") > MAX_RESPONSE) return finish(new Error("RTSP response too large"));
      if (buffer.includes("\r\n\r\n")) {
        try { finish(null, parseRtspOptionsResponse(buffer, cseq)); }
        catch { finish(new Error("Invalid RTSP response")); }
      }
    });
    socket.on("end", () => finish(new Error("RTSP peer closed before response")));
  });
}
