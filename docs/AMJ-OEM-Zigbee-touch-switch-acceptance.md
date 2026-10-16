# AMJ OEM Zigbee Touch Switch — Acceptance Checklist (V1)

## Product decision
AMJ will initially source OEM touch switches with **existing manufacturer firmware**.
No AMJ custom switch firmware is required. AMJ HomeOS/RUVEXA controls compatible
switches through the AMJ Universal Hub and a local Zigbee integration in Home Assistant.

## Manufacturer must confirm
- Zigbee 3.0 certification and exact manufacturer/model, hardware revision, firmware revision.
- Join/pair with third-party coordinator **without** mandatory vendor cloud, app or gateway.
- Proven support on the chosen HA ZHA or Zigbee2MQTT adapter/version. A Zigbee 3.0
  label alone does not establish compatibility.
- Standard on/off cluster and attribute reporting for **each gang**; accurate manual
  touch changes reported back to the hub.
- Restore behaviour after power loss; local physical switching without network.
- Electrical ratings, neutral/no-neutral wiring requirements, minimum loads, LED
  compatibility, safety approvals for target market, and installer instructions.
- Firmware update support and how recovery works if OTA fails.
- Manufacturer security update policy and end-of-life support.
- OEM branding, sample availability, MOQ, lead times and warranty.

## Required sample tests before purchasing inventory
1. Factory reset and join with AMJ prototype coordinator.
2. Control each relay from HA and observe the corresponding physical output.
3. Press each touch key locally; verify status updates in HA and AMJ preview.
4. Disconnect WAN; verify local touch and local Zigbee control still work.
5. Reboot HA and hub; verify devices reconnect without duplication.
6. Power-cycle the switch; confirm safe configured restore behaviour.
7. Run repeated commands and measure state reporting latency and reliability.
8. Confirm touch board electrical safety and regional compliance with a qualified tester.
9. Verify that one manufacturer's cloud is not necessary after commissioning.
10. Record exact tested coordinator, Zigbee integration, firmware and model.

## Software boundaries
- HA ZHA/Zigbee2MQTT owns Zigbee network commissioning and radio operations.
- AMJ HomeOS maps discovered HA entities to home-scoped canonical device records.
- AMJ Universal Hub provides the Zigbee coordinator hardware; Zigbee2MQTT needs its
  own runtime if selected (not included in the current Docker prototype).
- Never infer physical protocol from an HA entity domain.
- Installer must explicitly approve device import. Never auto-import every HA entity.
- RUVEXA does not receive HA tokens or need direct HA access.

## Current implementation status
The read-only discovery preview and installer approval validation are code-only.
The local runtime does **not yet** include Zigbee radio drivers, a coordinator,
ZHA commissioning UI, Zigbee2MQTT, secure RUVEXA pairing or device endpoints.
No physical switch has been verified.
