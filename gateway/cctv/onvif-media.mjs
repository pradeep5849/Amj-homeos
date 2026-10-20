/**
 * Local-only ONVIF Media1 GetProfiles. No credentials or stream URLs are returned.
 * Device addresses must be discovered and validated by the local gateway.
 */
const MAX_BYTES = 256 * 1024;
const ipv4 = value => {
  const parts = value.split(".");
  if (parts.length !== 4 || parts.some(p => !/^\d{1,3}$/.test(p) || Number(p) > 255)) return false;
  const [a, b] = parts.map(Number);
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
};
export function validateMediaServiceUrl(raw, sourceAddress) {
  if (!ipv4(sourceAddress)) throw new Error("Invalid private camera address");
  const url = new URL(raw);
  if (!["http:", "https:"].includes(url.protocol) || url.hostname !== sourceAddress ||
      url.username || url.password || url.hash || url.search || !["", "80", "443", "8080", "8000", "8899"].includes(url.port)) {
    throw new Error("Untrusted camera service URL");
  }
  return url;
}
export function getProfilesEnvelope() {
  return `<?xml version="1.0" encoding="UTF-8"?><s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:trt="http://www.onvif.org/ver10/media/wsdl"><s:Body><trt:GetProfiles/></s:Body></s:Envelope>`;
}
export function parseMediaProfiles(xml) {
  if (typeof xml !== "string" || Buffer.byteLength(xml) > MAX_BYTES) throw new Error("Invalid ONVIF response size");
  if (/<(?:[\w.-]+:)?Fault\b/.test(xml)) throw new Error("ONVIF device returned SOAP fault");
  const profiles = [];
  const pattern = /<(?:[\w.-]+:)?Profiles\b([^>]*)>([\s\S]*?)<\/(?:[\w.-]+:)?Profiles\s*>/g;
  for (const match of xml.matchAll(pattern)) {
    const token = /\btoken="([A-Za-z0-9_.:-]{1,128})"/.exec(match[1])?.[1];
    const name = /<(?:[\w.-]+:)?Name>([^<]{1,128})<\/(?:[\w.-]+:)?Name>/.exec(match[2])?.[1];
    if (token && name && !profiles.some(p => p.token === token)) profiles.push({ token, name });
    if (profiles.length >= 64) break;
  }
  return profiles;
}
export async function fetchMediaProfiles({ serviceUrl, sourceAddress, fetchImpl = fetch, signal }) {
  const url = validateMediaServiceUrl(serviceUrl, sourceAddress);
  // No Basic credentials on cleartext HTTP. Authenticated profiles require a later
  // WS-Security UsernameToken implementation and credential vault.
  const response = await fetchImpl(url, {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/soap+xml; charset=utf-8" },
    body: getProfilesEnvelope(),
    signal: signal ?? AbortSignal.timeout(5000),
  });
  if (response.status !== 200) throw new Error(`ONVIF profile request failed (HTTP ${response.status})`);
  const declared = Number(response.headers?.get?.("content-length") ?? 0);
  if (declared > MAX_BYTES) throw new Error("ONVIF response too large");
  // Bound actual bytes even if content-length is absent or inaccurate.
  if (!response.body) throw new Error("ONVIF response missing body");
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) throw new Error("ONVIF response too large");
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return parseMediaProfiles(Buffer.concat(chunks.map(v => Buffer.from(v))).toString("utf8"));
}
