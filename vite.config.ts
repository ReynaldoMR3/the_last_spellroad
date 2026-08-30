import { defineConfig } from "vite";
import { createArtBoardDevApi } from "./tools/art-board/devApi";

export default defineConfig({
  test: {
    // This checkout contains sibling agent worktrees. Limit discovery to this game's source
    // tree so `npm test` neither executes nor inherits stale tests from another worktree.
    include: ["src/**/*.test.ts", "tools/art-board/**/*.test.ts"]
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
  },
  plugins: [
    {
      name: "art-board-development-api",
      configureServer(server) {
        server.middlewares.use(createArtBoardDevApi({ repositoryRoot: process.cwd() }));
      }
    }
  ]
});
