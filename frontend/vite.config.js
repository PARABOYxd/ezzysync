import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'EzzySync CRM',
        short_name: 'EzzySync',
        description: 'Travel CRM - bookings, quotations, leads and invoicing.',
        theme_color: '#f97316',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: '/dashboard',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the app shell/static assets only. Deliberately no
        // runtime caching of /api/* - a CRM showing stale booking/lead
        // data from a cache would be a real bug, not a convenience.
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: { port: 5173 },
});
