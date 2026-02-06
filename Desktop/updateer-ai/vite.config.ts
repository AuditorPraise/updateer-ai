import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const backendUrl = env.VITE_BACKEND_URL || 'http://localhost:8080';
  
  return {
    plugins: [react()],
    server: {
      port: 5173,
      // This allows ngrok to bypass the security check
      allowedHosts: [
        '08147aa62bdb.ngrok-free.app', // Your specific host
        '.ngrok-free.app'              // Wildcard for any ngrok tunnel
      ],
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: false
        }
      }
    }
  };
});
