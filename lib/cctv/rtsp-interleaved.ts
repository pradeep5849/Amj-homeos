/**
 * RTSP interleaved RTP/RTCP framing for the local gateway.
 * Only frames from negotiated channels may be accepted by the caller.
 */
export type InterleavedFrame = { channel: number; payload: Buffer };

export class RtspInterleavedFramer {
  private pending = Buffer.alloc(0);

  push(chunk: Uint8Array): InterleavedFrame[] {
    this.pending = Buffer.concat([this.pending, chunk]);
    if (this.pending.length > 131072) throw new Error("Interleaved RTSP buffer exceeded");
    const frames: InterleavedFrame[] = [];
    while (this.pending.length >= 4) {
      if (this.pending[0] !== 0x24) throw new Error("Expected interleaved RTP frame");
      const channel = this.pending[1];
      const length = this.pending.readUInt16BE(2);
      if (length === 0 || length > 32768) throw new Error("Invalid interleaved RTP length");
      if (this.pending.length < length + 4) break;
      frames.push({
        channel, payload: Buffer.from(this.pending.subarray(4, length + 4)),
      });
      this.pending = this.pending.subarray(length + 4);
    }
    return frames;
  }
}

/** Inspect RTP v2 fixed header without interpreting or decoding video payload. */
export function inspectRtpPacket(packet: Uint8Array) {
  if (packet.length < 12 || packet.length > 32768 || (packet[0] >> 6) !== 2) {
    throw new Error("Invalid RTP packet");
  }
  const csrcCount = packet[0] & 15;
  const headerSize = 12 + csrcCount * 4;
  if (packet.length < headerSize) throw new Error("Truncated RTP header");
  let payloadOffset = headerSize;
  if (packet[0] & 0x10) {
    if (packet.length < payloadOffset + 4) throw new Error("Truncated RTP extension");
    const extensionWords = (packet[payloadOffset + 2] << 8) | packet[payloadOffset + 3];
    payloadOffset += 4 + extensionWords * 4;
    if (packet.length < payloadOffset) throw new Error("Truncated RTP extension");
  }
  const padding = (packet[0] & 0x20) ? packet[packet.length - 1] : 0;
  if (padding > packet.length - payloadOffset || ((packet[0] & 0x20) && padding === 0)) {
    throw new Error("Invalid RTP padding");
  }
  const view = Buffer.from(packet);
  return {
    marker: Boolean(packet[1] & 0x80),
    payloadType: packet[1] & 0x7f,
    sequence: view.readUInt16BE(2),
    timestamp: view.readUInt32BE(4),
    ssrc: view.readUInt32BE(8),
    headerSize: payloadOffset,
    payloadLength: packet.length - payloadOffset - padding,
  };
}
