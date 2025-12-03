import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(() => {
  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        'vue': 'vue/dist/vue.esm-bundler.js'
      }
    },
    define: {
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_DEVTOOLS__: false,
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false
    },
    server: {
      port: 3000,
      middlewareMode: false,
      fs: {
        strict: false
      },
      hmr: {
        overlay: false // Réduire les notifications overlay
      }
    },
    optimizeDeps: {
      include: [
        'vue', 
        'vue-router', 
        'firebase/app',
        'firebase/auth', 
        'firebase/firestore',
        'firebase/database'
      ]
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Firebase en chunk séparé (gros)
            firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/database'],
            // Core Vue séparé
            'vue-core': ['vue', 'vue-router'],
            // UI Frameworks séparés
            'vuestic': ['vuestic-ui'],
            'v-calendar': ['v-calendar'],
            // Excel parser (xlsx) séparé - gros ~350KB
            'xlsx': ['xlsx'],
            // FullCalendar séparé
            'fullcalendar': [
              '@fullcalendar/core',
              '@fullcalendar/daygrid', 
              '@fullcalendar/interaction',
              '@fullcalendar/vue3'
            ]
          }
        }
      },
      // Options pour la production
      emptyOutDir: true,
      reportCompressedSize: false,
      chunkSizeWarningLimit: 600
    }
  }
})
