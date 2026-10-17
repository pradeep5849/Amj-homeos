import { parseRtspSessionHeaders } from "./rtsp-session-headers";

/**
 * Incremental RTSP response framing. A response is complete only when its
 * declared body has arrived; a partial header must never advance session state.
 */
export class RtspResponseFramer {
  private pending = Buffer.alloc(0);

  push(chunk: Uint8Array): { status: number; sequence: number; session: string | null; transport: string | null; body: Buffer }[] {
    this.pending = Buffer.concat([this.pending, chunk]);
    if (this.pending.length > 131072) throw new Error("RTSP buffer limit exceeded");
    const results: { status: number; sequence: number; session: string | null; transport: string | null; body: Buffer }[] = [];
    while (true) {
      const headerEnd = this.pending.indexOf("\r\n\r\n");
      if (headerEnd < 0) {
        if (this.pending.length > 8192) throw new Error("RTSP headers too large");
        break;
      }
      if (headerEnd > 8192) throw new Error("RTSP headers too large");
      const header = this.pending.subarray(0, headerEnd).toString("latin1");
      const lengthHeaders = header.split("\r\n").filter(line => /^Content-Length:/i.test(line));
      if (lengthHeaders.length > 1) throw new Error("Duplicate RTSP body length");
      const length = lengthHeaders.length
        ? Number(lengthHeaders[0].slice(lengthHeaders[0].indexOf(":") + 1).trim()) : 0;
      if (!Number.isSafeInteger(length) || length < 0 || length > 32768) {
        throw new Error("Invalid RTSP body length");
      }
      const total = headerEnd + 4 + length;
      if (this.pending.length < total) break;
      const head = parseRtspSessionHeaders(header);
      results.push({ ...head, body: Buffer.from(this.pending.subarray(headerEnd + 4, total)) });
      this.pending = this.pending.subarray(total);
    }
    return results;
  }
}
