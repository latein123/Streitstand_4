import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // relative Pfade: der Build läuft auch aus einem Unterordner
  server: { port: 5173 },
  build: { chunkSizeWarningLimit: 1500 } // pdf.js und Tesseract sind groß – das ist erwartet
});
