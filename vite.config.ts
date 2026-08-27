import { defineConfig } from "vite";

export default defineConfig({
  test: {
    // This checkout contains sibling agent worktrees. Limit discovery to this game's source
    // tree so `npm test` neither executes nor inherits stale tests from another worktree.
    include: ["src/**/*.test.ts"]
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
    strictPort: true
  }
});
