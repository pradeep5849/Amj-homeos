import { describe, expect, it } from "vitest";
import { mapAmjCommandToHa, mapHomeAssistantEntity, mapHomeAssistantStates } from "../src/lib/home-assistant/mapping";

describe("Home Assistant entity mapping", () => {
  it("maps a dimmable light to AMJ power and brightness", () => {
    const mapped = mapHomeAssistantEntity({
      entity_id: "light.living_room", state: "on",
      attributes: { friendly_name: "Living Room", brightness: 128 },
    });
    expect(mapped).toMatchObject({
      provider: "HOME_ASSISTANT", externalId: "light.living_room",
      name: "Living Room", deviceType: "LIGHT", available: true,
      state: { power: true, brightness: 50 },
    });
  });

  it("marks unavailable switches offline instead of reporting off", () => {
    expect(mapHomeAssistantEntity({ entity_id: "switch.pump", state: "unavailable", attributes: {} }))
      .toMatchObject({ available: false, state: { power: null } });
  });

  it("excludes unsupported domains and deduplicates repeated entity IDs", () => {
    const states = [
      { entity_id: "climate.hall", state: "heat", attributes: {} },
      { entity_id: "switch.a", state: "off", attributes: {} },
      { entity_id: "switch.a", state: "on", attributes: {} },
    ];
    expect(mapHomeAssistantStates(states)).toMatchObject([
      { externalId: "switch.a", state: { power: true } },
    ]);
  });

  it("maps AMJ commands to Home Assistant service calls", () => {
    expect(mapAmjCommandToHa("light.room", "setBrightness", 75)).toEqual({
      domain: "light", service: "turn_on", entityId: "light.room", data: { brightness_pct: 75 },
    });
    expect(mapAmjCommandToHa("fan.office", "setSpeed", 40)).toMatchObject({
      domain: "fan", service: "set_percentage", data: { percentage: 40 },
    });
    expect(mapAmjCommandToHa("switch.pump", "setPower", false)).toMatchObject({
      domain: "switch", service: "turn_off",
    });
  });

  it("rejects invalid commands and out-of-range values", () => {
    expect(() => mapAmjCommandToHa("switch.pump", "setBrightness", 50)).toThrow();
    expect(() => mapAmjCommandToHa("light.room", "setBrightness", 120)).toThrow();
    expect(() => mapAmjCommandToHa("light.room", "setPower", "true")).toThrow();
  });
});
