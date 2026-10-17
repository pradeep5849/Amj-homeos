import type { LocalCameraEndpoint } from "./local-camera-endpoint";
import type { OnvifCredentials } from "./onvif-soap-client";
import { sendOnvifSoap } from "./onvif-soap-client";
import { onvifGetProfilesRequest, parseOnvifProfileTokens } from "./onvif-media-profiles";
import { onvifGetStreamUriRequest } from "./onvif-stream-uri";
import { parseOnvifStreamUri } from "./onvif-stream-response";

/**
 * Runs only inside the local gateway. Does not expose credentials or RTSP URLs
 * through the cloud API. A discovered stream URI is not proof that media works.
 */
export async function discoverOnvifStreams(
  endpoint: LocalCameraEndpoint,
  credentials: OnvifCredentials,
  fetcher: typeof fetch = fetch,
): Promise<{ profileToken: string; rtspUri: string }[]> {
  const profilesXml = await sendOnvifSoap(onvifGetProfilesRequest(endpoint), credentials, fetcher);
  const tokens = parseOnvifProfileTokens(profilesXml);
  const streams: { profileToken: string; rtspUri: string }[] = [];
  for (const token of tokens.slice(0, 8)) {
    const xml = await sendOnvifSoap(onvifGetStreamUriRequest(endpoint, token), credentials, fetcher);
    streams.push({ profileToken: token, rtspUri: parseOnvifStreamUri(xml, endpoint) });
  }
  return streams;
}
