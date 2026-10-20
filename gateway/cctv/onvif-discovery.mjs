import dgram from "node:dgram";
import { randomUUID } from "node:crypto";

const MULTICAST = "239.255.255.250";
const PORT = 3702;
const MAX_RESPONSE_BYTES = 32_768;
const PRIVATE_IPV4 = /^(?:10\.(?:\d{1,3}\.){2}\d{1,3}|192\.168\.(?:\d{1,3}\.)\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.(?:\d{1,3}\.)\d{1,3})$/;

export function discoveryProbe(id = randomUUID()) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Invalid discovery message ID");
  return `<?xml version="1.0" encoding="UTF-8"?>
<e:Envelope xmlns:e="http://www.w3.org/2003/05/soap-envelope" xmlns:w="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery" xmlns:dn="http://www.onvif.org/ver10/network/wsdl">
<e:Header><w:MessageID>urn:uuid:${id}</w:MessageID><w:To>urn:schemas-xmlsoap-org:ws:2005:04:discovery</w:To><w:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</w:Action></e:Header>
<e:Body><d:Probe><d:Types>dn:NetworkVideoTransmitter</d:Types></d:Probe></e:Body></e:Envelope>`;
}

/**
 * Extract device-service URLs from WS-Discovery ProbeMatches.
 * This is discovery metadata only; never fetch these URLs automatically.
 */
export function parseDiscoveryResponse(xml, sourceAddress) {
  if (typeof xml !== "string" || Buffer.byteLength(xml) > MAX_RESPONSE_BYTES) return [];
  if (!PRIVATE_IPV4.test(sourceAddress) || sourceAddress.split(".").some(n => Number(n) > 255)) return [];
  if (!/<(?:[A-Za-z_][\w.-]*:)?ProbeMatches\b/.test(xml)) return [];
  const matches = [...xml.matchAll(/<(?:[A-Za-z_][\w.-]*:)?XAddrs\b[^>]*>([^<]{1,8192})<\/(?:[A-Za-z_][\w.-]*:)?XAddrs>/g)];
  const results = new Set();
  for (const match of matches) for (const raw of match[1].trim().split(/\s+/)) {
    try {
      const url = new URL(raw);
      // Never trust a device-advertised remote endpoint or credentials.
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.hash) continue;
      if (url.hostname !== sourceAddress) continue;
      if (!url.port || Number(url.port) <= 65535) results.add(url.toString());
    } catch { /* malformed advertised URL */ }
  }
  return [...results].slice(0, 16);
}

export async function discoverOnvif({ timeoutMs = 3000, bindAddress = "0.0.0.0" } = {}) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 250 || timeoutMs > 10000) throw new Error("Invalid discovery timeout");
  if (bindAddress !== "0.0.0.0" && !PRIVATE_IPV4.test(bindAddress)) throw new Error("Invalid local bind address");
  const socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
  const discovered = new Map();
  try {
    await new Promise((resolve, reject) => {
      socket.once("error", reject);
      socket.bind(0, bindAddress, () => {
        socket.removeListener("error", reject);
        resolve();
      });
    });
    socket.on("message", (data, remote) => {
      if (data.length > MAX_RESPONSE_BYTES) return;
      for (const serviceUrl of parseDiscoveryResponse(data.toString("utf8"), remote.address)) {
        discovered.set(serviceUrl, { address: remote.address, serviceUrl });
      }
    });
    const probe = Buffer.from(discoveryProbe());
    await new Promise((resolve, reject) => socket.send(probe, PORT, MULTICAST, err => err ? reject(err) : resolve()));
    await new Promise(resolve => setTimeout(resolve, timeoutMs));
    return [...discovered.values()].slice(0, 256);
  } finally {
    socket.close();
  }
}
