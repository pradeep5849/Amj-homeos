import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  // Legacy dashboards use an initial async fetch from effects; refactor separately.
  // Keep the rule active for all new components and integrations.
  {
    files: [
      "app/account/account-panel.tsx",
      "app/admin/super-admin-dashboard.tsx",
      "app/admin/switchboard-catalog-panel.tsx",
      "app/dashboard/dashboard-shell.tsx",
      "app/dashboard/room-home-control.tsx",
      "app/dashboard/sharing-panel.tsx",
      "app/operator/admin-dashboard.tsx",
    ],
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
  globalIgnores([".next/**", "coverage/**", "next-env.d.ts"]),
]);
