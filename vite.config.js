import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const nativeModes = new Set(['client', 'provider', 'ops']);

export default defineConfig(({ mode }) => {
  const isNativeApp = nativeModes.has(mode);

  return {
    base: isNativeApp ? './' : '/',
    build: {
      target: 'es2020',
    },
    plugins: [
      react(),
      {
        name: 'strip-native-external-scripts',
        enforce: 'post',
        transformIndexHtml(html) {
          if (!isNativeApp) return html;
          return html
            .replace(/<link rel="dns-prefetch" href="https:\/\/www.googletagmanager.com" \/?>\s*/gi, '')
            .replace(/<script async src="https:\/\/www.googletagmanager.com[^"]*"><\/script>\s*/gi, '')
            .replace(/<script>[\s\S]*?gtag\('config', 'G-07H9H3Q3M9'[\s\S]*?<\/script>\s*/gi, '')
            .replace(/<script>[\s\S]*?google_remarketing_params[\s\S]*?<\/script>\s*/gi, '');
        },
      },
      VitePWA({
        disable: isNativeApp,
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg'],
        manifest: {
          name: 'ShareCharge',
          short_name: 'ShareCharge',
          description: 'טעינה שיתופית לרכבים חשמליים',
          lang: 'he',
          dir: 'rtl',
          theme_color: '#4f86f7',
          background_color: '#edf4ff',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: 'favicon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,svg,png,webp,jpg,jpeg}'],
          // Do not serve SPA shell for API routes (e.g. /api/health must return JSON).
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/sharecharge\.onrender\.com\/api\//,
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /\/api\//,
              handler: 'NetworkOnly',
            },
          ],
        },
      }),
    ],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  };
});
