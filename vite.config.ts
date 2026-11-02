import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

function copyDataJsonPlugin() {
  return {
    name: 'copy-data-json',
    closeBundle() {
      const srcDir = path.resolve(import.meta.dirname || '.', 'data');
      const destDir = path.resolve(import.meta.dirname || '.', 'dist', 'data');
      if (!fs.existsSync(srcDir)) return;
      fs.mkdirSync(destDir, { recursive: true });
      for (const file of fs.readdirSync(srcDir)) {
        if (file.endsWith('.json')) {
          fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
        }
      }
    },
  };
}

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss(), copyDataJsonPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || '.', '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
