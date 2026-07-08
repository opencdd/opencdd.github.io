import { defineConfig } from "astro/config";
import preact from "@astrojs/preact";
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  site: "https://opencdd.github.io",
  base: "/",
  trailingSlash: "ignore",
  output: "static",
  integrations: [
    preact({ compat: true }),
    tailwind({ applyBaseStyles: false }),
  ],
});
