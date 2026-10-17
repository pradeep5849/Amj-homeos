/**
 * Incrementally separates RTSP/1.0 responses from '$'-prefixed interleaved
 * media frames on one TCP connection. The caller handles session authorization.
 */
export type RtspWireFrame =
  | { kind: "response"; header: string; body: Buffer }
  | { kind: "interleaved"; channel: number; payload: Buffer };

export class RtspWireFramer {
  private pending = Buffer.alloc(0);

  push(chunk: Uint8Array): RtspWireFrame[] {
    this.pending = Buffer.concat([this.pending, chunk]);
    if (this.pending.length > 131072) throw new Error("RTSP wire buffer exceeded");
    const frames: RtspWireFrame[] = [];
    while (this.pending.length) {
      if (this.pending[0] === 0x24) {
        if (this.pending.length < 4) break;
        const length = this.pending.readUInt16BE(2);
        if (length < 1 || length > 32768) throw new Error("Invalid interleaved length");
        if (this.pending.length < length + 4) break;
        frames.push({
          kind: "interleaved", channel: this.pending[1],
          payload: Buffer.from(this.pending.subarray(4, length + 4)),
        });
        this.pending = this.pending.subarray(length + 4);
        continue;
      }
      const end = this.pending.indexOf("\r\n\r\n");
      if (end < 0) {
        if (this.pending.length > 8192) throw new Error("RTSP header limit exceeded");
        break;
      }
      if (end > 8192) throw new Error("RTSP header limit exceeded");
      const header = this.pending.subarray(0, end).toString("latin1");
      if (!/^RTSP\/1\.0 [1-5][0-9]{2}(?: |\r\n|$)/.test(header)) throw new Error("Invalid RTSP response");
      const matches = [...header.matchAll(/(?:^|\r\n)Content-Length:\s*([^\r\n]*)/gi)];
      if (matches.length > 1) throw new Error("Duplicate RTSP content length");
      const length = matches.length ? Number(matches[0][1].trim()) : 0;
      if (!Number.isSafeInteger(length) || length < 0 || length > 32768) throw new Error("Invalid RTSP content length");
      if (this.pending.length < end + 4 + length) break;
      frames.push({
        kind: "response", header,
        body: Buffer.from(this.pending.subarray(end + 4, end + 4 + length)),
      });
      this.pending = this.pending.subarray(end + 4 + length);
    }
    return frames;
  }
}
