import { digestAuthorization, parseDigestChallenge } from "./http-digest";

export type OnvifCredentials = { username: string; password: string };
export type OnvifSoapRequest = {
  url: string;
  method: "POST";
  headers: { "content-type": string };
  body: string;
};

/**
 * Local gateway only. Exactly one HTTP Digest retry is allowed; no redirects.
 * Caller must construct the URL from a validated private LAN endpoint.
 */
export async function sendOnvifSoap(
  request: OnvifSoapRequest,
  credentials: OnvifCredentials,
  fetcher: typeof fetch = fetch,
): Promise<string> {
  const base = {
    method: "POST" as const, body: request.body,
    redirect: "manual" as const, cache: "no-store" as const,
    signal: AbortSignal.timeout(4000),
  };
  let response = await fetcher(request.url, { ...base, headers: request.headers });
  if (response.status === 401) {
    const challenge = response.headers.get("www-authenticate");
    if (!challenge) throw new Error("Missing ONVIF authentication challenge");
    const authorization = digestAuthorization({
      challenge: parseDigestChallenge(challenge),
      username: credentials.username, password: credentials.password,
      method: "POST", uri: new URL(request.url).pathname,
    });
    response = await fetcher(request.url, {
      ...base, headers: { ...request.headers, authorization },
    });
  }
  if (!response.ok || response.status >= 300) throw new Error("ONVIF request rejected");
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (!Number.isFinite(declared) || declared > 65536) throw new Error("ONVIF response too large");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("ONVIF response missing body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > 65536) throw new Error("ONVIF response too large");
      chunks.push(part.value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks).toString("utf8");
}
