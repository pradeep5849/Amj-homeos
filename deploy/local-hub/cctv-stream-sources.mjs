import { isIP } from "node:net";

// A stream source is installer-only input. Never serialize its credentials,
// hand it to a browser, or fetch an arbitrary host from a customer request.
// Deployment additionally needs network-level LAN isolation and DNS pinning.
const CAMERA = /^camera\.[a-z0-9_]+$/;
const BRANDS = new Set(["hikvision", "cp_plus", "dahua"]);
const privateIPv4 = host => {
  if (isIP(host) !== 4) return false;
  const [a, b] = host.split(".").map(Number);
  return a === 10 || a === 192 && b === 168 ||
    a === 172 && b >= 16 && b <= 31;
};
export function parseCctvStreamSource(input) {
  if (!input || typeof input !== "object" || Array.isArray(input) ||
      Object.keys(input).sort().join(",") !== "brand,entityId,rtspUrl" ||
      typeof input.entityId !== "string" || !CAMERA.test(input.entityId) ||
      !BRANDS.has(input.brand) || typeof input.rtspUrl !== "string" ||
      input.rtspUrl.length > 2048) return null;
  // URL() normalizes dot segments; reject traversal in the original input first.
  if (/(?:^|\\/)\\.{1,2}(?:\\/|$)/.test(input.rtspUrl.slice(input.rtspUrl.indexOf("://") + 3)) ||
      /%2e/i.test(input.rtspUrl) || /%2f/i.test(input.rtspUrl) || /%5c/i.test(input.rtspUrl)) return null;
  let url;
  try { url = new URL(input.rtspUrl); } catch { return null; }
  if (url.protocol !== "rtsp:" || !privateIPv4(url.hostname) ||
      !url.port || !Number.isInteger(Number(url.port)) ||
      Number(url.port) < 1 || Number(url.port) > 65535 ||
      url.hash || url.search || !url.pathname.startsWith("/") ||
      url.pathname.includes("..") || /[\r\n]/.test(input.rtspUrl) ||
      url.username || url.password) return null;
  return { entityId: input.entityId, brand: input.brand,
    host: url.hostname, port: Number(url.port), path: url.pathname };
}
export function publicStreamSource(source) {
  if (!source) return null;
  return { entityId: source.entityId, brand: source.brand, configured: true };
}
