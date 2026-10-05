import { defineConfig } from 'vite';

import { fileURLToPath } from 'node:url';

const frontendRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: frontendRoot,
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
});
