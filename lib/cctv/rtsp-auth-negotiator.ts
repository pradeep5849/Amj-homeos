import { parseRtspSessionHeaders } from "./rtsp-session-headers";
import { RtspDigestRetry, type RtspDigestCredentials } from "./rtsp-digest-retry-state";
import { rtspMethodHeaders } from "./rtsp-method-headers";

type Method = "DESCRIBE" | "SETUP" | "PLAY";
export type RtspPendingRequest = {
  method: Method;
  uri: string;
  sequence: number;
  headers: string;
};

/**
 * Request sequencing for gateway-local RTSP Digest negotiation.
 * Does not open sockets, store credentials, or expose camera traffic.
 */
export class RtspAuthenticatedNegotiator {
  private nextSequence = 1;
  private pending: RtspPendingRequest | null = null;
  private retry: RtspDigestRetry | null = null;
  private retryUsed = false;
  private sessionId: string | undefined;

  constructor(
    private readonly streamUri: string,
    private readonly controlUri: string,
    private readonly credentials: RtspDigestCredentials,
  ) {}

  start(): RtspPendingRequest {
    if (this.pending || this.nextSequence !== 1) throw new Error("RTSP negotiation already started");
    return this.issue("DESCRIBE", this.streamUri);
  }

  private issue(method: Method, uri: string, authorization?: string): RtspPendingRequest {
    const headers = rtspMethodHeaders(method, this.sessionId) +
      (authorization ? "Authorization: " + authorization + "\r\n" : "");
    const request = { method, uri, sequence: this.nextSequence++, headers };
    this.pending = request;
    return request;
  }

  acceptResponse(rawHeaders: string): RtspPendingRequest | null {
    const pending = this.pending;
    if (!pending) throw new Error("Unexpected RTSP response");
    const response = parseRtspSessionHeaders(rawHeaders);
    if (response.sequence !== pending.sequence) throw new Error("RTSP response sequence mismatch");
    if (response.status === 401) {
      if (this.retryUsed) throw new Error("RTSP authentication retry exhausted");
      this.retry ??= new RtspDigestRetry(pending.method, pending.uri, this.credentials);
      const authorization = this.retry.authorization(rawHeaders, pending.sequence);
      this.retryUsed = true;
      return this.issue(pending.method, pending.uri, authorization);
    }
    if (response.status !== 200) throw new Error("RTSP request rejected");
    this.retry = null;
    this.retryUsed = false;
    if (pending.method === "DESCRIBE") return this.issue("SETUP", this.controlUri);
    if (pending.method === "SETUP") {
      if (!response.session || !response.transport ||
          !/^RTP\/AVP\/TCP(?:;|$)/i.test(response.transport) ||
          !/(?:^|;)\s*interleaved=0-1(?:;|$)/i.test(response.transport)) {
        throw new Error("RTSP transport was not confirmed");
      }
      this.sessionId = response.session;
      return this.issue("PLAY", this.streamUri);
    }
    if (response.session !== this.sessionId) throw new Error("RTSP PLAY session mismatch");
    this.pending = null;
    return null;
  }
}
