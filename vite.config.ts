import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
    plugins: [
        react(),
        crx({ manifest })
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    },
    build: {
        rollupOptions: {
            input: {
                popup: fileURLToPath(new URL('./src/popup/index.html', import.meta.url)),
                options: fileURLToPath(new URL('./src/options/index.html', import.meta.url)),
                sidepanel: fileURLToPath(new URL('./src/sidepanel/index.html', import.meta.url))
            }
        }
    }
});
