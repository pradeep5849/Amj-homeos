import { createHash, randomBytes } from "node:crypto";

/** HTTP Digest authentication for gateway-local ONVIF requests (RFC 7616 subset). */
export type DigestChallenge = {
  realm: string;
  nonce: string;
  algorithm: "MD5" | "SHA-256";
  qop: "auth";
  opaque?: string;
};

export function parseDigestChallenge(header: string): DigestChallenge {
  if (!/^Digest\s/i.test(header) || header.length > 4096) throw new Error("Unsupported HTTP authentication");
  const fields: Record<string, string> = {};
  const source = header.replace(/^Digest\s+/i, "");
  const pattern = /([a-zA-Z][\w-]*)\s*=\s*(?:"((?:[^"\\]|\\.)*)"|([^,\s]+))\s*(?:,|$)/g;
  let consumed = 0;
  for (const match of source.matchAll(pattern)) {
    if (match.index !== consumed && source.slice(consumed, match.index).trim()) throw new Error("Invalid Digest challenge");
    consumed = match.index! + match[0].length;
    const key = match[1].toLowerCase();
    if (key in fields) throw new Error("Duplicate Digest field");
    fields[key] = (match[2] ?? match[3]).replace(/\\(["\\])/g, "$1");
  }
  if (source.slice(consumed).trim()) throw new Error("Invalid Digest challenge");
  const algorithm = (fields.algorithm ?? "MD5").toUpperCase();
  if (algorithm !== "MD5" && algorithm !== "SHA-256") throw new Error("Unsupported Digest algorithm");
  if (!fields.realm || !fields.nonce || !fields.qop?.split(",").map(v => v.trim()).includes("auth")) {
    throw new Error("Unsupported Digest challenge");
  }
  if ([fields.realm, fields.nonce, fields.opaque ?? ""].some(v => /[\r\n]/.test(v))) {
    throw new Error("Invalid Digest header value");
  }
  return {
    realm: fields.realm, nonce: fields.nonce, algorithm, qop: "auth",
    ...(fields.opaque === undefined ? {} : { opaque: fields.opaque }),
  };
}

function quote(value: string) {
  return '"' + value.replace(/([\\"])/g, "\\$1") + '"';
}

export function digestAuthorization(input: {
  challenge: DigestChallenge;
  username: string;
  password: string;
  method: string;
  uri: string;
  cnonce?: string;
}) {
  const { challenge, username, password, method, uri } = input;
  if (!username || /[\r\n]/.test(username + uri + method)) throw new Error("Invalid Digest credentials");
  const hash = (value: string) => createHash(challenge.algorithm === "SHA-256" ? "sha256" : "md5")
    .update(value).digest("hex");
  const cnonce = input.cnonce ?? randomBytes(16).toString("hex");
  if (!/^[a-f0-9]{32}$/.test(cnonce)) throw new Error("Invalid Digest nonce");
  const nc = "00000001";
  const ha1 = hash(username + ":" + challenge.realm + ":" + password);
  const ha2 = hash(method + ":" + uri);
  const response = hash([ha1, challenge.nonce, nc, cnonce, "auth", ha2].join(":"));
  return "Digest username=" + quote(username) + ", realm=" + quote(challenge.realm) +
    ", nonce=" + quote(challenge.nonce) + ", uri=" + quote(uri) +
    ", algorithm=" + challenge.algorithm + ", response=" + quote(response) +
    ", qop=auth, nc=" + nc + ", cnonce=" + quote(cnonce) +
    (challenge.opaque === undefined ? "" : ", opaque=" + quote(challenge.opaque));
}
