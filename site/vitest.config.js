import { defineConfig } from 'vitest/config';

export default defineConfig({
  // The parked quote studio lives outside this directory (see
  // parked/studio/README.md). Vite refuses to load files above its root unless
  // they are explicitly allowed, so permit the repository root.
  server: { fs: { allow: ['..'] } },
  test: {
    environment: 'node',
    // '*.test.js' covers the live site. The second pattern keeps the parked
    // studio's parser tests running even though it is no longer deployed.
    include: ['*.test.js', '../parked/**/*.test.js']
  }
});
