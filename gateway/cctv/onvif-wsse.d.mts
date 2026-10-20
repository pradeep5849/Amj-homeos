export function usernameToken(input: { username: string; password: string; now?: Date; nonce?: Buffer }): string;
export function authenticatedGetProfilesEnvelope(input: { username: string; password: string; now?: Date; nonce?: Buffer }): string;
