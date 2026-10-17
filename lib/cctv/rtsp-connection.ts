import { Socket } from "node:net";
import type { LocalCameraEndpoint } from "./local-camera-endpoint";
import { parseLocalCameraEndpoint } from "./local-camera-endpoint";
import { validateDiscoveredRtspUri } from "./onvif-stream-uri";
import { RtspWireSession, type RtspWireSessionEvent } from "./rtsp-wire-session";

export type RtspConnectionResult = {
  events: RtspWireSessionEvent[];
  state: string;
};

/**
 * Gateway-local TCP session. This unauthenticated first pass requires the
 * caller to provide a validated media control URI and a verified SDP result.
 * It never exposes media to the cloud and closes the socket on every exit.
 */
export async function connectRtspSession(input: {
  endpoint: LocalCameraEndpoint;
  streamUri: string;
  mediaControlUri: string;
  timeoutMs?: number;
}): Promise<RtspConnectionResult> {
  const endpoint = parseLocalCameraEndpoint(input.endpoint);
  const streamUri = validateDiscoveredRtspUri(input.streamUri, endpoint);
  const controlUri = validateDiscoveredRtspUri(input.mediaControlUri, endpoint);
  const timeout = input.timeoutMs ?? 5000;
  if (!Number.isSafeInteger(timeout) || timeout < 100 || timeout > 30000) {
    throw new Error("Invalid RTSP timeout");
  }
  const gate = new RtspWireSession();
  return new Promise((resolve, reject) => {
    const socket = new Socket();
    const events: RtspWireSessionEvent[] = [];
    let finished = false;
    const finish = (error?: Error) => {
      if (finished) return;
      finished = true;
      socket.destroy();
      if (error) reject(error);
      else resolve({ events, state: gate.state });
    };
    const send = (method: string, uri: string, sequence: number, headers = "") => {
      socket.write(method + " " + uri + " RTSP/1.0\r\nCSeq: " + sequence +
        "\r\nUser-Agent: AMJ-HomeOS-Gateway\r\n" + headers + "\r\n");
    };
    socket.setTimeout(timeout);
    socket.once("error", error => finish(error));
    socket.once("timeout", () => finish(new Error("RTSP connection timed out")));
    socket.once("connect", () => send("DESCRIBE", streamUri, 1, "Accept: application/sdp\r\n"));
    socket.on("data", chunk => {
      try {
        const prior = gate.state;
        const received = gate.push(chunk);
        events.push(...received);
        if (prior === "DESCRIBE" && gate.state === "SETUP") {
          send("SETUP", controlUri, 2, "Transport: RTP/AVP/TCP;unicast;interleaved=0-1\r\n");
        } else if (prior === "SETUP" && gate.state === "PLAY") {
          // Session ID is not exposed by RtspWireSession; do not issue an
          // invalid PLAY request. Fail closed until the transport API provides it.
          finish(new Error("RTSP PLAY requires verified session identifier"));
        }
      } catch (error) { finish(error instanceof Error ? error : new Error("RTSP session failed")); }
    });
    socket.connect(endpoint.rtspPort, endpoint.host);
  });
}
