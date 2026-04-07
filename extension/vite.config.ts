import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 51234,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src/viewer"),
    },
  },
});
