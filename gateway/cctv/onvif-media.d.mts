export interface OnvifMediaProfile { token: string; name: string }
export function validateMediaServiceUrl(raw: string, sourceAddress: string): URL;
export function getProfilesEnvelope(): string;
export function parseMediaProfiles(xml: string): OnvifMediaProfile[];
export function fetchMediaProfiles(input: {
  serviceUrl: string; sourceAddress: string; credentials?: { username: string; password: string }; fetchImpl?: typeof fetch; signal?: AbortSignal;
}): Promise<OnvifMediaProfile[]>;
