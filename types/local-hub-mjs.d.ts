// Type declarations for the standalone Node.js hub prototype (.mjs).
declare module "*deploy/local-hub/pairing.mjs" {
  export function createLocalPairingAuthority(options?: {
    ttlMs?: number; maxSessions?: number; now?: () => number;
  }): {
    issue(): { sessionId: string; token: string; expiresAt: number };
    verify(sessionId: string, token: string): boolean;
    revoke(sessionId: string): boolean;
    count(): number;
  };
}
declare module "*deploy/local-hub/customer-sessions.mjs" {
  export function createCustomerSessionAuthority(options?: {
    now?: () => number; ttlMs?: number; maxSessions?: number;
  }): {
    issue(input: { clientId: string; allowedEntities: string[] }): {
      sessionId: string; token: string; expiresAt: number; clientId: string;
    };
    verify(input: { sessionId: string; token: string; entityId?: string }): boolean;
    revoke(id: string): boolean;
    count(): number;
  };
}
declare module "*deploy/local-hub/commands.mjs" {
  export function parseAllowedRelayCommand(
    input: unknown, allowlist: Set<string>,
  ): { domain: string; entityId: string; service: "turn_on" | "turn_off" } | null;
}
