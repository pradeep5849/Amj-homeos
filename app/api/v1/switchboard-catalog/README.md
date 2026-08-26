# Switchboard Catalog API

`GET /api/v1/switchboard-catalog` returns active catalog models to authenticated users. `includeInactive=true` is honored only for SUPER_ADMIN.

`POST /api/v1/switchboard-catalog` creates a model and is SUPER_ADMIN only. The payload includes brand, module size, configuration code, display/configuration labels, Wi-Fi/Zigbee protocols and an ordered channel list.

`PATCH /api/v1/switchboard-catalog/:id` updates display label, active state or code-verification flag and is SUPER_ADMIN only.
