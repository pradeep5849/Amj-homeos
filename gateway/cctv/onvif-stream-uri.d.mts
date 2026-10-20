export interface OnvifRtspStream { uri: string; host: string; port: number }
export function getStreamUriEnvelope(input: { profileToken: string; credentials?: { username: string; password: string } }): string;
export function parseStreamUriResponse(xml: string, sourceAddress: string): OnvifRtspStream;
export function fetchStreamUri(input: {
  mediaServiceUrl: string; sourceAddress: string; profileToken: string;
  credentials?: { username: string; password: string }; fetchImpl?: typeof fetch; signal?: AbortSignal;
}): Promise<OnvifRtspStream>;
