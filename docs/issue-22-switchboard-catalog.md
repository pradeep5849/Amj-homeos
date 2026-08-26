# Issue #22 — Switchboard Catalog

Initial implementation provides:

- iSpaze catalog seed with module size, configuration code, configuration label and UI-driving channel layout only; pricing is excluded.
- Wi-Fi and Zigbee protocol variants for every seeded model.
- Code-verification flags for the two catalog entries whose printed code and written fan configuration are inconsistent in the supplied catalogue.
- Authenticated catalog API; only SUPER_ADMIN may create/update catalog models.
- Super Admin catalog management page at `/admin/switchboards` and a Platform Console shortcut.
- Catalog rows include ordered control channels so the configuration code can drive a switchboard-style UI.

Next integration step: installed switchboard onboarding and room rendering (`Home -> Room -> Switchboard -> controls`).
