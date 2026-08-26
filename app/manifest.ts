import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return { name: "AMJ HomeOS", short_name: "AMJ", description: "AMJ HomeOS smart-home experience", start_url: "/dashboard", display: "standalone", background_color: "#f4f6f8", theme_color: "#071a2b" };
}
