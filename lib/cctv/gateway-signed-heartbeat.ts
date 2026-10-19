import { createPublicKey, verify } from "node:crypto";
import { z } from "zod";

/** Signed heartbeat body is bound to the gateway and its home. */
export const signedGatewayHeartbeatSchema = z.object({
  homeId: z.uuid(),
  gatewayId: z.uuid(),
  timestamp: z.iso.datetime({ offset: true }),
  nonce: z.string().regex(/^[A-Za-z0-9_-]{22,128}$/),
  cameraIds: z.array(z.uuid()).max(256).refine(ids => new Set(ids).size === ids.length),
  signature: z.string().regex(/^[A-Za-z0-9_-]{86}$/),
}).strict();

type Heartbeat = z.infer<typeof signedGatewayHeartbeatSchema>;
export function gatewayHeartbeatMessage(input: Omit<Heartbeat, "signature">): Buffer {
  const cameraIds = [...input.cameraIds].sort();
  return Buffer.from(JSON.stringify({
    domain: "amj:cctv:heartbeat:v1",
    homeId: input.homeId,
    gatewayId: input.gatewayId,
    timestamp: input.timestamp,
    nonce: input.nonce,
    cameraIds,
  }), "utf8");
}

export function verifySignedGatewayHeartbeat(input: Heartbeat, publicKeyPem: string, now = new Date()): boolean {
  if (!signedGatewayHeartbeatSchema.safeParse(input).success) return false;
  const time = Date.parse(input.timestamp);
  if (!Number.isFinite(time) || Math.abs(now.getTime() - time) > 60_000) return false;
  try {
    const key = createPublicKey(publicKeyPem);
    if (key.asymmetricKeyType !== "ed25519") return false;
    const signature = Buffer.from(input.signature, "base64url");
    if (signature.length !== 64) return false;
    const { signature: _signature, ...payload } = input;
    return verify(null, gatewayHeartbeatMessage(payload), key, signature);
  } catch { return false; }
}
