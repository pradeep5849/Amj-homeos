import { usernameToken } from "./onvif-wsse.mjs";
import { validateMediaServiceUrl } from "./onvif-media.mjs";

const MAX_BYTES = 256 * 1024;
const tokenPattern = /^[A-Za-z0-9_.:-]{1,128}$/;
export function getStreamUriEnvelope({ profileToken, credentials }) {
  if (!tokenPattern.test(profileToken ?? "")) throw new Error("Invalid ONVIF profile token");
  const header = credentials ? `<s:Header>${usernameToken(credentials)}</s:Header>` : "";
  return `<?xml version="1.0" encoding="UTF-8"?><s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:trt="http://www.onvif.org/ver10/media/wsdl"><s:Header/>${header}<s:Body><trt:GetStreamUri><trt:StreamSetup><trt:Stream>RTP-Unicast</trt:Stream><trt:Transport><trt:Protocol>RTSP</trt:Protocol></trt:Transport></trt:StreamSetup><trt:ProfileToken>${profileToken}</trt:ProfileToken></trt:GetStreamUri></s:Body></s:Envelope>`.replace("<s:Header/>", "");
}

export function parseStreamUriResponse(xml, sourceAddress) {
  if (typeof xml !== "string" || Buffer.byteLength(xml) > MAX_BYTES) throw new Error("Invalid ONVIF stream response");
  if (/<(?:[\w.-]+:)?Fault\b/.test(xml)) throw new Error("ONVIF SOAP fault");
  const match = /<(?:[\w.-]+:)?Uri\s*>([^<]{1,4096})<\/(?:[\w.-]+:)?Uri\s*>/.exec(xml);
  if (!match) throw new Error("ONVIF stream URI missing");
  const uri = match[1].trim().replaceAll("&amp;", "&");
  const parsed = new URL(uri);
  if (parsed.protocol !== "rtsp:" || parsed.username || parsed.password || parsed.hash ||
      parsed.hostname !== sourceAddress || !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(parsed.hostname)) {
    throw new Error("Untrusted ONVIF stream URI");
  }
  // Validate private IPv4 and disallow unsupported or out-of-range RTSP ports.
  validateMediaServiceUrl(`http://${parsed.hostname}/`, sourceAddress);
  const port = parsed.port ? Number(parsed.port) : 554;
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid RTSP port");
  return { uri: parsed.toString(), host: parsed.hostname, port };
}

export async function fetchStreamUri({ mediaServiceUrl, sourceAddress, profileToken, credentials, fetchImpl = fetch, signal }) {
  const url = validateMediaServiceUrl(mediaServiceUrl, sourceAddress);
  const response = await fetchImpl(url, {
    method: "POST", redirect: "manual",
    headers: { "Content-Type": "application/soap+xml; charset=utf-8" },
    body: getStreamUriEnvelope({ profileToken, credentials }),
    signal: signal ?? AbortSignal.timeout(5000),
  });
  if (response.status !== 200) throw new Error(`ONVIF GetStreamUri failed (HTTP ${response.status})`);
  if (Number(response.headers?.get?.("content-length") ?? 0) > MAX_BYTES) throw new Error("ONVIF response too large");
  if (!response.body) throw new Error("ONVIF response missing body");
  const reader = response.body.getReader();
  const chunks = []; let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) throw new Error("ONVIF response too large");
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return parseStreamUriResponse(Buffer.concat(chunks.map(x => Buffer.from(x))).toString("utf8"), sourceAddress);
}
