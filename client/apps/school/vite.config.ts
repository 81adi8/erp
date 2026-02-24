import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/core'),
      '@layouts': path.resolve(__dirname, './src/layouts'),
      '@store': path.resolve(__dirname, './src/store'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@styles': path.resolve(__dirname, './src/styles'),
    },
  },
  server: {
    port: 5173,
    host: true, // Allow access via subdomain
    // =========================================================================
    // Proxy Configuration for Same-Origin Cookies
    // =========================================================================
    // This makes API requests appear to come from the same origin as the frontend
    // enabling httpOnly cookies to work properly in development.
    //
    // Frontend: http://vdm.localhost:5173
    // API calls: http://vdm.localhost:5173/api  →  proxied to localhost:3000/api
    // Result: Same-origin, cookies work!
    // =========================================================================
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // Backend server
        changeOrigin: true,
        secure: false,
        // Rewrite cookies to work with the proxy
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            // Fix cookie domain for proxied responses
            const setCookie = proxyRes.headers['set-cookie'];
            if (setCookie) {
              proxyRes.headers['set-cookie'] = setCookie.map((cookie: string) =>
                cookie
                  .replace(/Domain=[^;]+;?/gi, '') // Remove domain restriction
                  .replace(/Secure;?/gi, '')       // Remove Secure flag for HTTP dev
              );
            }
          });
        },
      },
      // Proxy for Keycloak to avoid CORS issues in development
      '/auth-keycloak': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/auth-keycloak/, ''),
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
});
