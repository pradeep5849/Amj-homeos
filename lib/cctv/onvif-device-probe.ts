import { onvifDeviceInformationRequest } from "./onvif-device-request";
import { parseOnvifDeviceInformation } from "./onvif-device-response";
import type { LocalCameraEndpoint } from "./local-camera-endpoint";

/**
 * Gateway-local ONVIF probe. Does not follow redirects, send credentials,
 * or treat an HTTP success alone as proof of device compatibility.
 */
export async function queryOnvifDeviceInformation(
  endpoint: LocalCameraEndpoint,
  fetcher: typeof fetch = fetch,
) {
  const request = onvifDeviceInformationRequest(endpoint);
  const response = await fetcher(request.url, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(3000),
  });
  if (!response.ok) throw new Error("ONVIF device service returned HTTP " + response.status);
  const length = Number(response.headers.get("content-length") ?? "0");
  if (!Number.isFinite(length) || length > 65536) throw new Error("ONVIF response too large");
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
