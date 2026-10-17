import { RtspResponseFramer } from "./rtsp-response-framer";
import { RtspInterleavedFramer, inspectRtpPacket } from "./rtsp-interleaved";

export type RtspSessionPhase = "DESCRIBE" | "SETUP" | "PLAY" | "STREAMING" | "CLOSED";
export type RtspSessionEvent =
  | { type: "response"; status: number; sequence: number }
  | { type: "rtp"; sequence: number; timestamp: number; payloadType: number }
  | { type: "rtcp"; bytes: number };

/**
 * Session protocol gate, not a network client or video decoder.
 * Only explicitly negotiated interleaved channels are accepted.
 */
export class RtspSessionGate {
  private phase: RtspSessionPhase = "DESCRIBE";
  private expectedSequence = 1;
  private sessionId: string | null = null;
  private rtpChannel = 0;
  private rtcpChannel = 1;
  private responseFramer = new RtspResponseFramer();
  private mediaFramer = new RtspInterleavedFramer();

  get state() { return this.phase; }

  acceptResponseBytes(chunk: Uint8Array): RtspSessionEvent[] {
    if (this.phase === "STREAMING" || this.phase === "CLOSED") throw new Error("Unexpected RTSP control response");
    const responses = this.responseFramer.push(chunk);
    const events: RtspSessionEvent[] = [];
    for (const response of responses) {
      if (response.sequence !== this.expectedSequence || response.status !== 200) {
        this.phase = "CLOSED";
        throw new Error("RTSP session negotiation failed");
      }
      if (this.phase === "DESCRIBE") {
        this.phase = "SETUP";
      } else if (this.phase === "SETUP") {
        if (!response.session || !response.transport ||
            !/^RTP\/AVP\/TCP;.*(?:^|;)interleaved=0-1(?:;|$)/i.test(response.transport)) {
          this.phase = "CLOSED";
          throw new Error("RTSP interleaved transport not confirmed");
        }
        this.sessionId = response.session;
        this.phase = "PLAY";
      } else if (this.phase === "PLAY") {
        if (response.session !== this.sessionId) {
          this.phase = "CLOSED";
          throw new Error("RTSP session changed during PLAY");
        }
        this.phase = "STREAMING";
      }
      this.expectedSequence++;
      events.push({ type: "response", status: response.status, sequence: response.sequence });
    }
    return events;
  }

  acceptMediaBytes(chunk: Uint8Array): RtspSessionEvent[] {
    if (this.phase !== "STREAMING") throw new Error("RTSP media before PLAY");
    return this.mediaFramer.push(chunk).map(frame => {
      if (frame.channel === this.rtpChannel) {
        const packet = inspectRtpPacket(frame.payload);
        return { type: "rtp", sequence: packet.sequence, timestamp: packet.timestamp, payloadType: packet.payloadType };
      }
      if (frame.channel === this.rtcpChannel) return { type: "rtcp", bytes: frame.payload.length };
      throw new Error("Unexpected RTSP media channel");
    });
  }

  close() { this.phase = "CLOSED"; }
}
