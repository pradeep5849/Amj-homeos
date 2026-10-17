import { RtspWireFramer } from "./rtsp-wire-framer";
import { parseRtspSessionHeaders } from "./rtsp-session-headers";
import { inspectRtpPacket } from "./rtsp-interleaved";

export type RtspWireSessionEvent =
  | { type: "control"; status: number; sequence: number }
  | { type: "rtp"; sequence: number; timestamp: number; payloadType: number }
  | { type: "rtcp"; bytes: number };

/**
 * One-connection RTSP control/media state machine.
 * Caller must send DESCRIBE CSeq 1, SETUP CSeq 2, PLAY CSeq 3.
 * Authentication challenges and reconnects are deliberately not handled here.
 */
export class RtspWireSession {
  private readonly wire = new RtspWireFramer();
  private stage: "DESCRIBE" | "SETUP" | "PLAY" | "STREAMING" | "CLOSED" = "DESCRIBE";
  private session: string | null = null;

  get state() { return this.stage; }
  /** Only available after the SETUP response has been validated. */
  get negotiatedSessionId(): string | null { return this.stage === "PLAY" || this.stage === "STREAMING" ? this.session : null; }

  push(bytes: Uint8Array): RtspWireSessionEvent[] {
    if (this.stage === "CLOSED") throw new Error("RTSP session closed");
    const events: RtspWireSessionEvent[] = [];
    try {
      for (const frame of this.wire.push(bytes)) {
        if (frame.kind === "response") {
          if (this.stage === "STREAMING") throw new Error("Unexpected RTSP control response");
          const head = parseRtspSessionHeaders(frame.header);
          const expected = this.stage === "DESCRIBE" ? 1 : this.stage === "SETUP" ? 2 : 3;
          if (head.sequence !== expected || head.status !== 200) throw new Error("RTSP negotiation rejected");
          if (this.stage === "DESCRIBE") {
            this.stage = "SETUP";
          } else if (this.stage === "SETUP") {
            if (!head.session || !head.transport ||
                !/^RTP\/AVP\/TCP(?:;|$)/i.test(head.transport) ||
                !/(?:^|;)\s*interleaved=0-1(?:;|$)/i.test(head.transport)) {
              throw new Error("RTSP TCP transport not negotiated");
            }
            this.session = head.session;
            this.stage = "PLAY";
          } else {
            if (head.session !== this.session) throw new Error("RTSP session changed");
            this.stage = "STREAMING";
          }
          events.push({ type: "control", status: head.status, sequence: head.sequence });
        } else {
          if (this.stage !== "STREAMING") throw new Error("RTP before PLAY completed");
          if (frame.channel === 0) {
            const packet = inspectRtpPacket(frame.payload);
            events.push({
              type: "rtp", sequence: packet.sequence, timestamp: packet.timestamp,
              payloadType: packet.payloadType,
            });
          } else if (frame.channel === 1) {
            events.push({ type: "rtcp", bytes: frame.payload.length });
          } else {
            throw new Error("Unexpected RTP channel");
          }
        }
      }
    } catch (error) {
      this.stage = "CLOSED";
      throw error;
    }
    return events;
  }

  close() { this.stage = "CLOSED"; }
}
