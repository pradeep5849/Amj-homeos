export interface SignedHeartbeat {
  homeId: string;
  gatewayId: string;
  timestamp: string;
  nonce: string;
  cameraIds: string[];
  signature: string;
}
export function heartbeatMessage(payload: Omit<SignedHeartbeat, "signature">): Buffer;
export function signedHeartbeat(input: {
  homeId: string; gatewayId: string; privateKey: string; cameraIds?: string[]; now?: Date;
}): SignedHeartbeat;
export function heartbeatUrl(baseUrl: string, homeId: string, gatewayId: string): URL;
export function sendHeartbeat(input: {
  baseUrl: string; homeId: string; gatewayId: string; privateKey: string;
  fetchImpl?: typeof fetch; signal?: AbortSignal;
}): Promise<{ accepted: boolean; receivedAt?: string }>;
export function main(env?: NodeJS.ProcessEnv): Promise<void>;
