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
        'pinia',
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
            firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/database'],
            vue: ['vue', 'vue-router', 'pinia']
          }
        }
      },
      // Options pour la production
      emptyOutDir: true,
      reportCompressedSize: false
    }
  }
})
