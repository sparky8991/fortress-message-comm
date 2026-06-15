import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    // libsodium-wrappers-sumo is CommonJS — Vite must PRE-BUNDLE it (CJS→ESM) so the
    // browser gets one fast ESM module and sodium.ready actually resolves. Excluding it
    // served the raw multi-MB CJS un-bundled, which broke libsodium init (the setup hang)
    // and stalled page load. `include` forces a correct pre-bundle even though the dep is
    // only reached deep in the graph (via the encryption dialog).
    include: ["libsodium-wrappers-sumo"],
  },
}));
