import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  base: mode === 'native' ? './' : '/asteridle/',
  define: {
    __ASTERIDLE_BUILD_ID__: JSON.stringify(new Date().toISOString())
  },
  server: {
    port: 5173
  },
  preview: {
    port: 4173
  }
}));
