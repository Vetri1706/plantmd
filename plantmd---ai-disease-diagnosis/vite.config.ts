import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  // Fix: Cast process to any to avoid TS error about missing cwd() property
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    server: {
      port: 3000,
      open: true
    },
    resolve: {
      alias: {
        '@': '/'
      }
    },
    // Define process.env to allow the app to access the API key
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  };
});