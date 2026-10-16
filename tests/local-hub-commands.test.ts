import { describe, expect, it } from "vitest";
import { parseAllowedRelayCommand } from "../deploy/local-hub/commands.mjs";

describe("local relay safety gate", () => {
  const allowed = new Set(["switch.kitchen", "light.hall"]);
  it("accepts only explicitly allowed boolean on/off commands", () => {
    expect(parseAllowedRelayCommand({ entityId: "switch.kitchen", power: true }, allowed))
      .toEqual({ domain: "switch", entityId: "switch.kitchen", service: "turn_on" });
    expect(parseAllowedRelayCommand({ entityId: "light.hall", power: false }, allowed)?.service)
      .toBe("turn_off");
  });
  it("rejects unapproved devices, extra fields, sensors and malformed input", () => {
    for (const command of [
      { entityId: "switch.other", power: true },
      { entityId: "sensor.kitchen", power: true },
      { entityId: "switch.kitchen", power: "on" },
      { entityId: "switch.kitchen", power: true, extra: 1 },
      { entityId: "../switch.kitchen", power: true },
      null,
    ]) expect(parseAllowedRelayCommand(command, allowed)).toBeNull();
  });
});
