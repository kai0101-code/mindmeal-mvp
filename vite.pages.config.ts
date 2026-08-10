import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/mindmeal_v2_backup/",
  build: {
    outDir: "dist-pages",
    emptyOutDir: true,
  },
});
