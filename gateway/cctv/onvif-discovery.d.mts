export interface OnvifDiscoveryResult { address: string; serviceUrl: string }
export function discoveryProbe(id?: string): string;
export function parseDiscoveryResponse(xml: string, sourceAddress: string): string[];
export function discoverOnvif(options?: { timeoutMs?: number; bindAddress?: string }): Promise<OnvifDiscoveryResult[]>;
