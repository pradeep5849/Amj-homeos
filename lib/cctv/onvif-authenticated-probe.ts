import { digestAuthorization, parseDigestChallenge } from "./http-digest";
import { onvifDeviceInformationRequest } from "./onvif-device-request";
import { parseOnvifDeviceInformation } from "./onvif-device-response";
import type { LocalCameraEndpoint } from "./local-camera-endpoint";

type Credentials = { username: string; password: string };

/** Gateway-local authenticated ONVIF probe; credentials are never returned. */
export async function queryAuthenticatedOnvifDevice(
  endpoint: LocalCameraEndpoint,
  credentials: Credentials,
  fetcher: typeof fetch = fetch,
) {
  const request = onvifDeviceInformationRequest(endpoint);
  const options = {
    method: request.method, headers: request.headers, body: request.body,
    redirect: "manual" as const, cache: "no-store" as const,
    signal: AbortSignal.timeout(4000),
  };
  let response = await fetcher(request.url, options);
  if (response.status === 401) {
    const challengeHeader = response.headers.get("www-authenticate");
    if (!challengeHeader) throw new Error("ONVIF authentication challenge missing");
    const challenge = parseDigestChallenge(challengeHeader);
    const uri = new URL(request.url).pathname;
    const authorization = digestAuthorization({
      challenge, username: credentials.username, password: credentials.password,
      method: "POST", uri,
    });
    response = await fetcher(request.url, {
      ...options, headers: { ...request.headers, authorization },
    });
  }
  if (response.status >= 300 && response.status < 400) throw new Error("ONVIF redirect rejected");
  if (!response.ok) throw new Error("ONVIF authentication or device request failed");
  const declaredLength = Number(response.headers.get("content-length") ?? "0");
  if (!Number.isFinite(declaredLength) || declaredLength > 65536) throw new Error("ONVIF response too large");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("ONVIF response missing body");
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > 65536) throw new Error("ONVIF response too large");
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return parseOnvifDeviceInformation(Buffer.concat(chunks).toString("utf8"));
}
