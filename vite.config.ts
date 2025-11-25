import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // This is crucial: Vite does not polyfill process.env by default in the browser.
      // We explicitly map process.env.API_KEY to the value from the environment.
      // Fallback to empty string to ensure build doesn't fail if key is missing (will fail at runtime instead)
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
    },
  };
});