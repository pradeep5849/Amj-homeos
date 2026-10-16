import { verifyOwnershipSignature } from "./ownership-proof.mjs";
import { createOwnershipReplayGuard } from "./ownership-replay-guard.mjs";

// Local cryptographic verification pipeline only. The trusted backend must
// authenticate the gateway public key and independently verify account ownership.
// No activation transition or access grant is performed by this module.
export function createOwnershipVerificationPipeline({
  now = () => Date.now(),
  replayGuard = createOwnershipReplayGuard({ now }),
} = {}) {
  return {
    verifyAndConsume({ publicKeyPem, challenge, signature, expectedGatewayId }) {
      if (typeof expectedGatewayId !== "string" || typeof publicKeyPem !== "string") return false;
      const time = now();
      if (!Number.isSafeInteger(time)) return false;
      if (!verifyOwnershipSignature(publicKeyPem, challenge, signature, {
        now: time,
        expectedGatewayId,
      })) return false;
      return replayGuard.consume(challenge);
    },
  };
}
