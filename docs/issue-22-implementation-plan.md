# Issue #22 implementation plan

This branch will implement a Super Admin-managed switchboard catalog for AMJ HomeOS.

## Locked requirements

- No pricing fields.
- Catalog hierarchy: brand -> module size -> configuration/model code -> protocol variant -> UI/channel layout.
- iSpaze models are seeded first.
- Every iSpaze model supports Wi-Fi and Zigbee variants.
- Protocol affects onboarding/transport only; it must not change the board UI.
- Configuration code drives the rendered switchboard controls.
- Catalog templates are separate from installed switchboard instances.
- Future brands such as Varni must be addable by Super Admin without code changes.
- Existing production device data and APIs must remain compatible.
- Routine successful control commands update silently; errors remain visible.

## Implementation order

1. Add Prisma enums/models and safe migration for catalog templates, protocol variants, layout channels and installed switchboards.
2. Seed iSpaze catalog definitions without pricing, flagging manufacturer-code inconsistencies instead of silently correcting them.
3. Add Super Admin CRUD APIs and validation.
4. Add Super Admin catalog management UI.
5. Add installed switchboard provisioning/assignment APIs.
6. Render Home -> Room -> Switchboards -> controls from catalog channel definitions.
7. Preserve existing standalone devices and migrate UI progressively.
8. Add tests and verify typecheck/build before merge.
