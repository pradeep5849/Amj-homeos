import { describe, expect, it, vi } from "vitest";
import { HomeAssistantClient } from "../src/lib/home-assistant/client";

describe("HomeAssistantClient", () => {
  const baseUrl = "http://127.0.0.1:8123";
  it("rejects unsafe URLs and missing credentials", () => {
    expect(() => new HomeAssistantClient({ baseUrl: "file:///etc/passwd", token: "secret" })).toThrow();
    expect(() => new HomeAssistantClient({ baseUrl, token: "" })).toThrow();
  });
  it("sends authenticated REST requests and validates responses", async () => {
    const mockFetch = vi.fn(async (_url: unknown, init: RequestInit) => {
      expect(init.headers).toMatchObject({ Authorization: "Bearer test-token" });
      return { ok: true, json: async () => [{ entity_id: "light.kitchen", state: "on", attributes: {} }] };
    });
    const client = new HomeAssistantClient({ baseUrl, token: "test-token", fetchImpl: mockFetch as unknown as typeof fetch });
    expect(await client.listStates()).toHaveLength(1);
    expect(String(mockFetch.mock.calls[0][0])).toContain("/api/states");
  });
  it("rejects malformed entities and prevents entity override", async () => {
    const client = new HomeAssistantClient({ baseUrl, token: "token", fetchImpl: vi.fn() });
    await expect(client.getState("../evil")).rejects.toThrow("Invalid entity ID");
    await expect(client.callService("light", "turn_on", "light.kitchen", { entity_id: "light.other" })).rejects.toThrow();
  });
  it("authenticates and subscribes to state changes", async () => {
    const listeners = new Map<string, ((event: { data?: unknown }) => void)[]>();
    const send = vi.fn();
    const close = vi.fn();
    const socket = {
      addEventListener: (type: string, callback: (event: { data?: unknown }) => void) =>
        listeners.set(type, [...(listeners.get(type) ?? []), callback]),
      send,
      close,
    };
    const client = new HomeAssistantClient({
      baseUrl, token: "secret", socketFactory: () => socket,
    });
    const events: unknown[] = [];
    const pending = client.subscribeStateChanges((event) => events.push(event));
    const emit = (msg: unknown) => listeners.get("message")?.forEach((fn) => fn({ data: JSON.stringify(msg) }));
    emit({ type: "auth_required" });
    expect(JSON.parse(send.mock.calls[0][0])).toEqual({ type: "auth", access_token: "secret" });
    emit({ type: "auth_ok" });
    expect(JSON.parse(send.mock.calls[1][0])).toEqual({ id: 1, type: "subscribe_events", event_type: "state_changed" });
    emit({ type: "result", id: 1, success: true });
    const stop = await pending;
    emit({ type: "event", id: 1, event: { event_type: "state_changed", data: { entity_id: "light.kitchen" } } });
    expect(events).toHaveLength(1);
    stop();
    expect(close).toHaveBeenCalledOnce();
  });
});
