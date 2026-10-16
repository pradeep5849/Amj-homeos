/**
 * Home Assistant local API transport. Hub-side only: never import into client components.
 * This is an isolated adapter foundation, not yet wired to AMJ's device command service.
 */
export type HaEntityState = {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed?: string;
  last_updated?: string;
};

export type HaEvent = {
  event_type: string;
  data?: Record<string, unknown>;
  time_fired?: string;
};

export interface HaSocket {
  addEventListener(type: "open" | "message" | "close" | "error", listener: (event: { data?: unknown }) => void): void;
  send(data: string): void;
  close(): void;
}

export type HaClientOptions = {
  baseUrl: string;
  token: string;
  fetchImpl?: typeof fetch;
  socketFactory?: (url: string) => HaSocket;
  timeoutMs?: number;
};

function parseBaseUrl(value: string): URL {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error("Home Assistant URL must be a plain HTTP(S) origin");
  }
  if (url.pathname !== "/") throw new Error("Home Assistant URL must not include a path");
  return url;
}

function isEntityState(value: unknown): value is HaEntityState {
  return !!value && typeof value === "object" &&
    typeof (value as HaEntityState).entity_id === "string" &&
    typeof (value as HaEntityState).state === "string" &&
    !!(value as HaEntityState).attributes &&
    typeof (value as HaEntityState).attributes === "object" &&
    !Array.isArray((value as HaEntityState).attributes);
}

export class HomeAssistantClient {
  private readonly origin: URL;
  private readonly token: string;
  private readonly fetchImpl: typeof fetch;
  private readonly socketFactory: (url: string) => HaSocket;
  private readonly timeoutMs: number;

  constructor(options: HaClientOptions) {
    this.origin = parseBaseUrl(options.baseUrl);
    if (!options.token.trim()) throw new Error("Home Assistant token is required");
    this.token = options.token;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.socketFactory = options.socketFactory ?? ((url) => new WebSocket(url) as HaSocket);
    this.timeoutMs = options.timeoutMs ?? 10000;
    if (!Number.isSafeInteger(this.timeoutMs) || this.timeoutMs <= 0) throw new Error("Invalid timeout");
  }

  private async request(path: string, init: RequestInit = {}): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(new URL(path, this.origin), {
        ...init,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: "application/json",
          ...(init.body ? { "Content-Type": "application/json" } : {}),
        },
      });
      if (!response.ok) throw new Error(`Home Assistant request failed: HTTP ${response.status}`);
      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  async listStates(): Promise<HaEntityState[]> {
    const response = await this.request("/api/states");
    if (!Array.isArray(response) || !response.every(isEntityState)) {
      throw new Error("Unexpected Home Assistant states response");
    }
    return response;
  }

  async getState(entityId: string): Promise<HaEntityState> {
    if (!/^[a-z][a-z0-9_]*\.[a-z0-9_]+$/.test(entityId)) throw new Error("Invalid entity ID");
    const response = await this.request(`/api/states/${entityId}`);
    if (!isEntityState(response)) throw new Error("Unexpected Home Assistant state response");
    return response;
  }

  async callService(domain: string, service: string, entityId: string, data: Record<string, unknown> = {}): Promise<unknown> {
    const identifier = /^[a-z][a-z0-9_]*$/;
    if (!identifier.test(domain) || !identifier.test(service)) throw new Error("Invalid service");
    if (!/^[a-z][a-z0-9_]*\.[a-z0-9_]+$/.test(entityId)) throw new Error("Invalid entity ID");
    if (Object.hasOwn(data, "entity_id")) throw new Error("entity_id must be supplied separately");
    return this.request(`/api/services/${domain}/${service}`, {
      method: "POST",
      body: JSON.stringify({ ...data, entity_id: entityId }),
    });
  }

  /**
   * Opens a state_changed subscription and returns a stop function.
   * Caller must handle reconnection/resynchronization by calling listStates again.
   */
  async subscribeStateChanges(onEvent: (event: HaEvent) => void): Promise<() => void> {
    const wsUrl = new URL(this.origin);
    wsUrl.protocol = wsUrl.protocol === "https:" ? "wss:" : "ws:";
    wsUrl.pathname = "/api/websocket";
    const socket = this.socketFactory(wsUrl.toString());
    let settled = false;
    let authenticated = false;
    let subscribed = false;
    let closed = false;
    let subscriptionId = 0;
    let nextId = 1;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cleanup = () => { if (timer) clearTimeout(timer); };
    const close = () => { closed = true; cleanup(); socket.close(); };

    return new Promise<() => void>((resolve, reject) => {
      const fail = (message: string) => {
        if (settled) return;
        settled = true;
        close();
        reject(new Error(message));
      };
      timer = setTimeout(() => fail("Home Assistant WebSocket handshake timed out"), this.timeoutMs);
      socket.addEventListener("message", (event) => {
        if (closed) return;
        let msg: Record<string, unknown>;
        try { msg = JSON.parse(String(event.data)) as Record<string, unknown>; } catch { fail("Invalid Home Assistant WebSocket JSON"); return; }
        if (msg.type === "auth_required" && !authenticated) {
          socket.send(JSON.stringify({ type: "auth", access_token: this.token }));
        } else if (msg.type === "auth_ok" && !authenticated) {
          authenticated = true;
          subscriptionId = nextId++;
          socket.send(JSON.stringify({ id: subscriptionId, type: "subscribe_events", event_type: "state_changed" }));
        } else if (msg.type === "auth_invalid") {
          fail("Home Assistant WebSocket authentication rejected");
        } else if (msg.type === "result" && msg.id === subscriptionId && !subscribed) {
          if (msg.success !== true) { fail("Home Assistant event subscription rejected"); return; }
          subscribed = true;
          settled = true;
          cleanup();
          resolve(close);
        } else if (msg.type === "event" && msg.id === subscriptionId && subscribed && (msg.event as HaEvent | undefined)?.event_type === "state_changed") {
          try { onEvent(msg.event as HaEvent); } catch { /* consumer errors must not break transport */ }
        }
      });
      socket.addEventListener("close", () => { if (!settled) fail("Home Assistant WebSocket closed before subscription"); });
      socket.addEventListener("error", () => { if (!settled) fail("Home Assistant WebSocket connection failed"); });
    });
  }
}
