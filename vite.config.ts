import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "url";
import { createWikiAdminPlugin } from "./scripts/wiki-admin-plugin";

export default defineConfig({
  plugins: [react(), tailwindcss(), createWikiAdminPlugin()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 8291,
    strictPort: true,
  },
});
