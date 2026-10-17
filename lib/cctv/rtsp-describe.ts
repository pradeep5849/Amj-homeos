import { Socket } from "node:net";
import type { LocalCameraEndpoint } from "./local-camera-endpoint";
import { validateDiscoveredRtspUri } from "./onvif-stream-uri";

export type RtspDescribeResult = { statusCode: number; contentType: string | null; sdp: string | null };

/**
 * Gateway-local, unauthenticated RTSP DESCRIBE. 401 means authentication is
 * required; it must never be mistaken for successful media negotiation.
 */
export async function describeRtspStream(
  uri: string, endpoint: LocalCameraEndpoint, timeoutMs = 3000,
): Promise<RtspDescribeResult> {
  validateDiscoveredRtspUri(uri, endpoint);
  return new Promise((resolve, reject) => {
    const socket = new Socket();
    let received = Buffer.alloc(0);
    let settled = false;
    const finish = (error?: Error, result?: RtspDescribeResult) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (error) reject(error);
      else resolve(result!);
    };
    socket.setTimeout(timeoutMs);
    socket.once("timeout", () => finish(new Error("RTSP DESCRIBE timed out")));
    socket.once("error", error => finish(error));
    socket.once("connect", () => socket.write(
      "DESCRIBE " + uri + " RTSP/1.0\r\nCSeq: 1\r\nAccept: application/sdp\r\nUser-Agent: AMJ-HomeOS-Gateway\r\n\r\n",
    ));
    socket.on("data", chunk => {
      received = Buffer.concat([received, chunk]);
      if (received.length > 65536) return finish(new Error("RTSP response too large"));
      const end = received.indexOf("\r\n\r\n");
      if (end < 0) return;
      const header = received.subarray(0, end).toString("latin1");
      const lines = header.split("\r\n");
      const status = /^RTSP\/1\.0 ([1-5][0-9]{2})(?:\s|$)/.exec(lines[0]);
      if (!status) return finish(new Error("Invalid RTSP response"));
      const contentType = lines.find(line => /^Content-Type:/i.test(line))?.split(":").slice(1).join(":").trim() ?? null;
      const lengthLine = lines.find(line => /^Content-Length:/i.test(line));
      const length = lengthLine ? Number(lengthLine.split(":").slice(1).join(":").trim()) : 0;
      if (!Number.isSafeInteger(length) || length < 0 || length > 32768) return finish(new Error("Invalid RTSP body length"));
      if (received.length < end + 4 + length) return;
      const sdp = Number(status[1]) === 200 && contentType?.toLowerCase().startsWith("application/sdp")
        ? received.subarray(end + 4, end + 4 + length).toString("utf8") : null;
      finish(undefined, { statusCode: Number(status[1]), contentType, sdp });
    });
    socket.connect(endpoint.rtspPort, endpoint.host);
  });
}
