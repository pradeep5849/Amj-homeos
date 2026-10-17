export type RtspSessionHeaders = {
  status: number;
  sequence: number;
  session: string | null;
  transport: string | null;
};

export function parseRtspSessionHeaders(raw: string): RtspSessionHeaders {
  if (raw.length > 8192) throw new Error("RTSP headers too large");
  const lines = raw.split("\r\n").filter(Boolean);
  const first = /^RTSP\/1\.0 ([1-5][0-9]{2})(?: |$)/.exec(lines.shift() ?? "");
  if (!first) throw new Error("Invalid RTSP status");
  const headers = new Map<string, string>();
  for (const line of lines) {
    const match = /^([A-Za-z][A-Za-z0-9-]*): (.*)$/.exec(line);
    if (!match || /[\r\n]/.test(match[2])) throw new Error("Invalid RTSP header");
    const key = match[1].toLowerCase();
    if (headers.has(key)) throw new Error("Duplicate RTSP header");
    headers.set(key, match[2]);
  }
  const sequence = Number(headers.get("cseq"));
  if (!Number.isSafeInteger(sequence) || sequence < 1) throw new Error("Invalid RTSP sequence");
  const session = headers.get("session")?.split(";")[0].trim() ?? null;
  if (session !== null && !/^[A-Za-z0-9_.-]{1,128}$/.test(session)) {
    throw new Error("Invalid RTSP session");
  }
  return {
    status: Number(first[1]), sequence, session,
    transport: headers.get("transport") ?? null,
  };
}
