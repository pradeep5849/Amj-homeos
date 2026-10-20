import { authenticatedGetProfilesEnvelope } from "./onvif-wsse.mjs";
import { validateMediaServiceUrl } from "./onvif-media.mjs";

/** ONVIF Device GetServices (IncludeCapability=false). */
export function getServicesEnvelope(credentials) {
  const token = credentials ? authenticatedGetProfilesEnvelope(credentials).match(/<wsse:Security[\s\S]*?<\/wsse:Security>/)?.[0] : "";
  const header = token ? `<s:Header>${token}</s:Header>` : "";
  return `<?xml version="1.0" encoding="UTF-8"?><s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:tds="http://www.onvif.org/ver10/device/wsdl">${header}<s:Body><tds:GetServices><tds:IncludeCapability>false</tds:IncludeCapability></tds:GetServices></s:Body></s:Envelope>`;
}

export function parseMediaServiceUrls(xml, sourceAddress) {
  if (typeof xml !== "string" || Buffer.byteLength(xml) > 256 * 1024) throw new Error("Invalid ONVIF services response");
  if (/<(?:[\w.-]+:)?Fault\b/.test(xml)) throw new Error("ONVIF SOAP fault");
  const result = [];
  const servicePattern = /<(?:[\w.-]+:)?Service\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?Service\s*>/g;
  for (const match of xml.matchAll(servicePattern)) {
    const namespace = /<(?:[\w.-]+:)?Namespace\s*>([^<]+)<\/(?:[\w.-]+:)?Namespace\s*>/.exec(match[1])?.[1];
    if (!["http://www.onvif.org/ver10/media/wsdl", "http://www.onvif.org/ver20/media/wsdl"].includes(namespace)) continue;
    const raw = /<(?:[\w.-]+:)?XAddr\s*>([^<]+)<\/(?:[\w.-]+:)?XAddr\s*>/.exec(match[1])?.[1];
    if (!raw) continue;
    try {
      const url = validateMediaServiceUrl(raw.trim().replaceAll("&amp;", "&"), sourceAddress);
      if (!result.some(r => r.url === url.toString())) result.push({ kind: namespace.includes("/ver20/") ? "MEDIA2" : "MEDIA1", url: url.toString() });
    } catch { /* ignore unsafe advertised service */ }
    if (result.length >= 16) break;
  }
  return result;
}

export async function fetchMediaServiceUrls({ deviceServiceUrl, sourceAddress, credentials, fetchImpl = fetch, signal }) {
  const url = validateMediaServiceUrl(deviceServiceUrl, sourceAddress);
  const response = await fetchImpl(url, {
    method: "POST", redirect: "manual",
    headers: { "Content-Type": "application/soap+xml; charset=utf-8" },
    body: getServicesEnvelope(credentials),
    signal: signal ?? AbortSignal.timeout(5000),
  });
  if (response.status !== 200) throw new Error(`ONVIF GetServices failed (HTTP ${response.status})`);
  if (Number(response.headers?.get?.("content-length") ?? 0) > 256 * 1024) throw new Error("ONVIF response too large");
  if (!response.body) throw new Error("ONVIF response missing body");
  const reader = response.body.getReader();
  const chunks = []; let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > 256 * 1024) throw new Error("ONVIF response too large");
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return parseMediaServiceUrls(Buffer.concat(chunks.map(x => Buffer.from(x))).toString("utf8"), sourceAddress);
}
