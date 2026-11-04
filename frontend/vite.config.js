import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// In development, Vite runs on its own port, so /api calls are forwarded
// to Express. This avoids CORS without any extra library.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
