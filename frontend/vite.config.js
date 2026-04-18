// ============================================================
// vite.config.js — Configuration Vite pour React
// ============================================================

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        // Proxy : redirige /api vers le backend Express (port 5000)
        // Évite les problèmes CORS en développement
        proxy: {
            '/api': {
                target: 'http://localhost:5000',
                changeOrigin: true
            }
        }
    }
});