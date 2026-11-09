import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('@supabase/')) return 'vendor-supabase';
          if (id.includes('@radix-ui/') || id.includes('cmdk') || id.includes('vaul')) return 'vendor-ui';
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('react') || id.includes('@tanstack/')) return 'vendor-react';
        },
      },
    },
  },
});
