import { createHash, randomBytes } from "node:crypto";

const escapeXml = value => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/**
 * ONVIF WS-Security UsernameToken PasswordDigest:
 * Base64(SHA1(raw nonce bytes + Created UTF-8 + password UTF-8)).
 * Credentials must stay on the local gateway; never expose to HomeOS clients.
 */
export function usernameToken({ username, password, now = new Date(), nonce = randomBytes(24) }) {
  if (typeof username !== "string" || !username || username.length > 128 ||
      typeof password !== "string" || !password || password.length > 512) {
    throw new Error("Invalid ONVIF credentials");
  }
  if (!(now instanceof Date) || !Number.isFinite(now.getTime()) ||
      !Buffer.isBuffer(nonce) || nonce.length < 16 || nonce.length > 64) {
    throw new Error("Invalid ONVIF token nonce or timestamp");
  }
  const created = now.toISOString();
  const digest = createHash("sha1").update(nonce).update(created, "utf8").update(password, "utf8").digest("base64");
  return `<wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd"><wsse:UsernameToken><wsse:Username>${escapeXml(username)}</wsse:Username><wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordDigest">${digest}</wsse:Password><wsse:Nonce EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary">${nonce.toString("base64")}</wsse:Nonce><wsu:Created>${created}</wsu:Created></wsse:UsernameToken></wsse:Security>`;
}
export function authenticatedGetProfilesEnvelope({ username, password, now, nonce }) {
  const header = usernameToken({ username, password, now, nonce });
  return `<?xml version="1.0" encoding="UTF-8"?><s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:trt="http://www.onvif.org/ver10/media/wsdl"><s:Header>${header}</s:Header><s:Body><trt:GetProfiles/></s:Body></s:Envelope>`;
}
