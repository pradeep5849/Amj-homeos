import { validateDiscoveredRtspUri } from "./onvif-stream-uri";
import type { LocalCameraEndpoint } from "./local-camera-endpoint";

export function rtspSetupRequest(
  controlUri: string, endpoint: LocalCameraEndpoint, sequence: number,
): string {
  validateDiscoveredRtspUri(controlUri, endpoint);
  if (!Number.isSafeInteger(sequence) || sequence < 1) throw new Error("Invalid RTSP sequence");
  return "SETUP " + controlUri + " RTSP/1.0\r\n" +
    "CSeq: " + sequence + "\r\n" +
    "Transport: RTP/AVP/TCP;unicast;interleaved=0-1\r\n" +
    "User-Agent: AMJ-HomeOS-Gateway\r\n\r\n";
}

export function rtspPlayRequest(
  streamUri: string, endpoint: LocalCameraEndpoint, session: string, sequence: number,
): string {
  validateDiscoveredRtspUri(streamUri, endpoint);
  if (!/^[A-Za-z0-9_.-]{1,128}$/.test(session) ||
      !Number.isSafeInteger(sequence) || sequence < 1) {
    throw new Error("Invalid RTSP session");
  }
  return "PLAY " + streamUri + " RTSP/1.0\r\n" +
    "CSeq: " + sequence + "\r\n" +
    "Session: " + session + "\r\n" +
    "Range: npt=0.000-\r\n" +
    "User-Agent: AMJ-HomeOS-Gateway\r\n\r\n";
}
