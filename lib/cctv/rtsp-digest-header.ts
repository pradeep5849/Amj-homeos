import { parseDigestChallenge, digestAuthorization } from "./http-digest";

export type RtspDigestCredentials = { username: string; password: string };

/** Builds a single method-bound RTSP Digest header from a 401 challenge. */
export function rtspDigestHeader(input: {
  challenge: string;
  credentials: RtspDigestCredentials;
  method: "DESCRIBE" | "SETUP" | "PLAY";
  uri: string;
}) {
  if (!/^rtsp:\/\//.test(input.uri) || /[\r\n]/.test(input.uri)) {
    throw new Error("Invalid RTSP URI");
  }
  return digestAuthorization({
    challenge: parseDigestChallenge(input.challenge),
    username: input.credentials.username,
    password: input.credentials.password,
    method: input.method,
    uri: input.uri,
  });
}
