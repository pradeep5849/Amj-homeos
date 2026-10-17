import { Socket } from "node:net";
import { parseLocalCameraEndpoint, type LocalCameraEndpoint } from "./local-camera-endpoint";
import { validateDiscoveredRtspUri } from "./onvif-stream-uri";
import { RtspWireFramer } from "./rtsp-wire-framer";
import { inspectRtpPacket } from "./rtsp-interleaved";
import { RtspAuthenticatedNegotiator, type RtspPendingRequest } from "./rtsp-auth-negotiator";
import type { RtspDigestCredentials } from "./rtsp-digest-header";

/** Gateway-local authenticated RTSP handshake; closes before relaying any media. */
export async function probeAuthenticatedRtsp(input: {
  endpoint: LocalCameraEndpoint;
  streamUri: string;
  mediaControlUri: string;
  credentials: RtspDigestCredentials;
  timeoutMs?: number;
  socketFactory?: () => Socket;
}): Promise<{ authenticated: true; firstMediaBytes: number }> {
  const endpoint = parseLocalCameraEndpoint(input.endpoint);
  const stream = validateDiscoveredRtspUri(input.streamUri, endpoint);
  const control = validateDiscoveredRtspUri(input.mediaControlUri, endpoint);
  const timeout = input.timeoutMs ?? 5000;
  if (!Number.isSafeInteger(timeout) || timeout < 100 || timeout > 30000) {
    throw new Error("Invalid RTSP timeout");
  }
  const negotiation = new RtspAuthenticatedNegotiator(stream, control, input.credentials);
  const parser = new RtspWireFramer();
  return new Promise((resolve, reject) => {
    const socket = input.socketFactory?.() ?? new Socket();
    let finished = false;
    let streaming = false;
    const finish = (error?: Error, bytes?: number) => {
      if (finished) return;
      finished = true;
      socket.destroy();
      if (error) reject(error);
      else resolve({ authenticated: true, firstMediaBytes: bytes ?? 0 });
    };
    const send = (request: RtspPendingRequest) => {
      socket.write(request.method + " " + request.uri + " RTSP/1.0\r\nCSeq: " +
        request.sequence + "\r\nUser-Agent: AMJ-HomeOS-Gateway\r\n" + request.headers + "\r\n");
    };
    socket.setTimeout(timeout);
    socket.once("error", error => finish(error));
    socket.once("timeout", () => finish(new Error("RTSP probe timed out")));
    socket.once("close", () => finish(new Error("RTSP camera closed before media")));
    socket.once("connect", () => send(negotiation.start()));
    socket.on("data", chunk => {
      if (finished) return;
      try {
        for (const frame of parser.push(chunk)) {
          if (frame.kind === "response") {
            if (streaming) throw new Error("Unexpected RTSP response after PLAY");
            const next = negotiation.acceptResponse(frame.header);
            if (next) send(next);
            else streaming = true;
          } else {
            if (!streaming || frame.channel !== 0) {
              throw new Error("Unexpected RTSP interleaved media");
            }
            inspectRtpPacket(frame.payload);
            finish(undefined, frame.payload.length);
            return;
          }
        }
      } catch (error) {
        finish(error instanceof Error ? error : new Error("RTSP probe failed"));
      }
    });
    socket.connect(endpoint.rtspPort, endpoint.host);
  });
}
