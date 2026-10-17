/** Parse a bounded SDP description without assuming that video is playable. */
export type RtspSdpMedia = {
  kind: string;
  port: number;
  protocol: string;
  payloadTypes: number[];
  codecs: { payloadType: number; encoding: string; clockRate: number }[];
};

export function parseRtspSdp(input: string): RtspSdpMedia[] {
  if (input.length > 32768 || /[^\x09\x0a\x0d\x20-\x7e]/.test(input)) {
    throw new Error("Invalid SDP encoding or length");
  }
  const lines = input.split(/\r?\n/).filter(Boolean);
  if (lines.length > 512 || !lines.some(line => line === "v=0")) {
    throw new Error("Invalid SDP session");
  }
  const media: RtspSdpMedia[] = [];
  for (const line of lines) {
    if (line.startsWith("m=")) {
      const match = /^m=([a-zA-Z]+) (\d{1,5}) ([A-Za-z0-9/]+) (\d{1,3}(?: \d{1,3})*)$/.exec(line);
      if (!match) throw new Error("Invalid SDP media line");
      const port = Number(match[2]);
      const payloadTypes = match[4].split(" ").map(Number);
      if (port > 65535 || payloadTypes.some(n => n > 127) || media.length >= 16) {
        throw new Error("Unsupported SDP media");
      }
      media.push({ kind: match[1].toLowerCase(), port, protocol: match[3], payloadTypes, codecs: [] });
    } else if (line.startsWith("a=rtpmap:") && media.length) {
      const match = /^a=rtpmap:(\d{1,3}) ([A-Za-z0-9_.-]+)\/(\d{1,9})(?:\/\d+)?$/.exec(line);
      if (!match) throw new Error("Invalid SDP rtpmap");
      const payloadType = Number(match[1]);
      if (payloadType > 127 || !media[media.length - 1].payloadTypes.includes(payloadType)) {
        throw new Error("Unexpected SDP payload type");
      }
      media[media.length - 1].codecs.push({
        payloadType, encoding: match[2].toUpperCase(), clockRate: Number(match[3]),
      });
    }
  }
  return media;
}

export function hasH264VideoMedia(sdp: string): boolean {
  return parseRtspSdp(sdp).some(media =>
    media.kind === "video" && media.protocol.toUpperCase() === "RTP/AVP" &&
    media.codecs.some(codec => codec.encoding === "H264" && codec.clockRate === 90000),
  );
}
