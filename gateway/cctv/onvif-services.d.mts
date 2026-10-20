export interface OnvifMediaService { kind: "MEDIA1" | "MEDIA2"; url: string }
export function getServicesEnvelope(credentials?: { username: string; password: string }): string;
export function parseMediaServiceUrls(xml: string, sourceAddress: string): OnvifMediaService[];
export function fetchMediaServiceUrls(input: {
  deviceServiceUrl: string; sourceAddress: string; credentials?: { username: string; password: string };
  fetchImpl?: typeof fetch; signal?: AbortSignal;
}): Promise<OnvifMediaService[]>;
