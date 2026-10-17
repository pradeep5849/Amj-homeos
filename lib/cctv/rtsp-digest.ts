import { digestAuthorization, parseDigestChallenge } from "./http-digest";

/** Build a single RTSP Digest retry after a 401 response. Never log the header. */
export function rtspDigestRetry(input: {
  authenticateHeader: string;
  username: string;
  password: string;
  method: "DESCRIBE" | "SETUP" | "PLAY" | "TEARDOWN";
  uri: string;
  cseq: number;
}): string {
  if (!Number.isSafeInteger(input.cseq) || input.cseq < 1 || input.cseq > 2147483647) {
    throw new Error("Invalid RTSP sequence");
  }
  const parsed = new URL(input.uri);
  if (parsed.protocol !== "rtsp:" || parsed.username || parsed.password ||
      /[\r\n]/.test(input.uri)) throw new Error("Invalid RTSP request URI");
  const authorization = digestAuthorization({
    challenge: parseDigestChallenge(input.authenticateHeader),
    username: input.username, password: input.password,
    method: input.method, uri: input.uri,
  });
  return input.method + " " + input.uri + " RTSP/1.0\r\n" +
    "CSeq: " + input.cseq + "\r\n" +
    "Authorization: " + authorization + "\r\n" +
    "User-Agent: AMJ-HomeOS-Gateway\r\n" +
    (input.method === "DESCRIBE" ? "Accept: application/sdp\r\n" : "") +
    "\r\n";
}
