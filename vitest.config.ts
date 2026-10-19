import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node' },
  // Each checkout (including agent worktrees that symlink node_modules) keeps its own cache.
  cacheDir: '.vitest-cache',
});
