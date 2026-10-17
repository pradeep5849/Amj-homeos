import { parseRtspSessionHeaders } from "./rtsp-session-headers";
import { rtspDigestHeader, type RtspDigestCredentials } from "./rtsp-digest-header";

/**
 * Handles at most one Digest challenge for a single RTSP request.
 * The caller must send the returned header using the new CSeq.
 */
export class RtspDigestRetry {
  private challenged = false;
  constructor(
    private readonly method: "DESCRIBE" | "SETUP" | "PLAY",
    private readonly uri: string,
    private readonly credentials: RtspDigestCredentials,
  ) {}

  authorization(response: string, expectedSequence: number): string {
    if (this.challenged) throw new Error("RTSP authentication retry exhausted");
    const parsed = parseRtspSessionHeaders(response);
    if (parsed.status !== 401 || parsed.sequence !== expectedSequence) {
      throw new Error("Unexpected RTSP authentication response");
    }
    const matches = response.split("\r\n").filter(line => /^WWW-Authenticate:/i.test(line));
    if (matches.length !== 1) throw new Error("Expected one RTSP authentication challenge");
    const challenge = matches[0].slice(matches[0].indexOf(":") + 1).trim();
    const header = rtspDigestHeader({
      challenge, credentials: this.credentials, method: this.method, uri: this.uri,
    });
    this.challenged = true;
    return header;
  }
}
