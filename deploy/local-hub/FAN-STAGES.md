# RUVEXA fan speed stages (prototype)

RUVEXA shows **Speed 1–4**, **Speed 1–5**, or **percentage speed**, depending on the installed fan.

Configure the actual stage count for each installed fan in the gateway environment:

```sh
AMJ_FAN_SPEED_STAGES=fan.bedroom:5,fan.living_room:4,fan.office:percentage
```

A fan must also be in `AMJ_ALLOWED_RELAY_ENTITIES` and explicitly granted to the customer session. Fans without an explicitly configured stage count or percentage mode do not show a speed selector. Only HA fans reporting speed capability are eligible.

Percentage-mode fans display percentages (0–100% in 5% UI increments) and send the selected percentage directly to HA.\n\nThe gateway maps discrete stages to Home Assistant `fan.set_percentage` because that is the underlying integration API. For a five-stage fan: 1→20%, 2→40%, 3→60%, 4→80%, 5→100%. For four stages: 1→25%, 2→50%, 3→75%, 4→100%. The physical fan/integration may have different speed steps; validate each supported OEM model before commissioning. ON/OFF remains separate; zero speed is not a stage.

This is a prototype local gateway API. Stage counts are installer-configured and not inferred from device names.
