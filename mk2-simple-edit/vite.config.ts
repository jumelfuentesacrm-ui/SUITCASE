import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Deliberately minimal: no SSR, no router plugin, no path aliasing magic.
// MK2 is a small static-shell SPA that reads its content from Supabase.
export default defineConfig({
  plugins: [react()],
});
