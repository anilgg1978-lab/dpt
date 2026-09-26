import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const rawKey =
    env.VITE_GEMINI_API_KEY ||
    env.GEMINI_API_KEY ||
    env.GOOGLE_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    '';
  // Do not bake internal AI Studio session tokens (AQ.*) into standalone static bundles
  const clientSafeKey = rawKey.startsWith('AQ.') ? '' : rawKey;

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(clientSafeKey),
      'process.env.API_KEY': JSON.stringify(clientSafeKey),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: false,
    },
  };
});
