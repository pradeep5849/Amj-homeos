import { createHash, randomBytes } from "node:crypto";

export function hashToken(token: string) { return createHash("sha256").update(token).digest("hex"); }
export function newRawToken() { return randomBytes(32).toString("base64url"); }
