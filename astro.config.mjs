import { defineConfig } from "astro/config";
import vue from "@astrojs/vue";
import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://opencdd.github.io",
  base: "/",
  trailingSlash: "ignore",
  output: "static",
  integrations: [vue(), mdx()],
  vite: {
    plugins: [tailwindcss()],
  },
});
